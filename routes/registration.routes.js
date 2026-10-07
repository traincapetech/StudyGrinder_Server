import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Registration from "../model/registration.model.js";

dotenv.config();

const registrationRouter = express.Router();

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

/**
 * Build Hostinger SMTP transporter
 * Force IPv4 (family: 4) because cloud platforms like Render have IPv6 routing blocks to Hostinger
 */
function createHostingerTransporter() {
  const smtpUser = process.env.EMAIL_USER;
  const smtpPass = process.env.EMAIL_PASS;

  if (!smtpUser || !smtpPass) {
    return null;
  }

  const host = process.env.SMTP_HOST || "smtp.hostinger.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const isSecure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    family: 4, // Force IPv4 — critical for Render / Hostinger compatibility
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * POST /registration
 * Primary endpoint for the single website registration form
 */
registrationRouter.post("/", async (req, res) => {
  try {
    const {
      name = "",
      phone = "",
      email = "",
      country = "",
      countryCode = "",
      linkedinUrl = "",
      course = "",
      courseCode = "",
      telegram = "",
      source = "Website Form",
    } = req.body || {};

    const safeName = String(name).trim();
    const safePhone = String(phone).trim();
    const safeEmail = String(email).trim().toLowerCase();
    const safeCountry = String(country).trim();
    const safeCountryCode = String(countryCode).trim();
    const safeLinkedin = String(linkedinUrl).trim();
    const safeCourse = String(course).trim();
    const safeCourseCode = String(courseCode).trim();
    const safeTelegram = String(telegram).trim();
    const safeSource = String(source).trim();

    // Field Validations
    if (!safeName || safeName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter your full name (at least 2 characters).",
      });
    }

    if (!isValidEmail(safeEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const numericPhone = safePhone.replace(/[^\d+]/g, "");
    if (!numericPhone || numericPhone.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number.",
      });
    }

    if (!safeCountry) {
      return res.status(400).json({
        success: false,
        message: "Please enter your country.",
      });
    }

    if (!safeCourse) {
      return res.status(400).json({
        success: false,
        message: "Please specify the target course or certification.",
      });
    }

    // Capture metadata
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "";
    const userAgent = req.headers["user-agent"] || "";

    // 1. ALWAYS SAVE TO MONGODB FIRST — Guarantees NO data loss even if SMTP is delayed
    let savedRegistration = null;
    try {
      savedRegistration = await Registration.create({
        name: safeName,
        phone: safePhone,
        countryCode: safeCountryCode,
        email: safeEmail,
        country: safeCountry,
        linkedinUrl: safeLinkedin,
        course: safeCourse,
        courseCode: safeCourseCode,
        telegram: safeTelegram,
        source: safeSource,
        ip: clientIp,
        userAgent,
        emailStatus: "pending",
      });
    } catch (dbError) {
      console.error("❌ Failed to save registration to MongoDB:", dbError);
      // Even if MongoDB fails, we can still attempt email sending below
    }

    // 2. PREPARE HOSTINGER EMAIL NOTIFICATION
    const smtpUser = process.env.EMAIL_USER;
    const receiverEmail =
      process.env.REGISTRATION_RECEIVER_EMAIL || "register@studygrinder.com";

    const fullPhone = safeCountryCode
      ? `${safeCountryCode} ${safePhone}`
      : safePhone;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f1f5f9; margin: 0; padding: 20px; }
          .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
          .badge { display: inline-block; background: #ea580c; color: white; padding: 6px 16px; border-radius: 9999px; font-weight: 700; font-size: 13px; text-transform: uppercase; margin-top: 14px; letter-spacing: 0.5px; }
          .content { padding: 32px 28px; }
          .field-group { margin-bottom: 18px; border-bottom: 1px solid #f1f5f9; padding-bottom: 14px; }
          .field-group:last-child { border-bottom: none; }
          .label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.8px; margin-bottom: 4px; }
          .value { font-size: 16px; color: #0f172a; font-weight: 500; }
          .value a { color: #2563eb; text-decoration: none; font-weight: 600; }
          .value a:hover { text-decoration: underline; }
          .highlight-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 18px; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>StudyGrinder Registration</h1>
            <p>New candidate enrollment inquiry submitted</p>
            <span class="badge">${safeCourse}${safeCourseCode ? ` (${safeCourseCode})` : ""}</span>
          </div>
          
          <div class="content">
            <div class="highlight-box">
              <div class="label">Course / Program</div>
              <div class="value" style="font-size: 18px; color: #1e3a8a; font-weight: 700;">
                ${safeCourse}
              </div>
              ${safeCourseCode ? `<div style="font-size: 13px; color: #475569; margin-top: 4px;"><strong>Course Code:</strong> ${safeCourseCode}</div>` : ""}
            </div>

            <div class="field-group">
              <div class="label">Full Name</div>
              <div class="value">${safeName}</div>
            </div>

            <div class="field-group">
              <div class="label">Email Address</div>
              <div class="value"><a href="mailto:${safeEmail}">${safeEmail}</a></div>
            </div>

            <div class="field-group">
              <div class="label">Phone Number</div>
              <div class="value"><a href="tel:${fullPhone}">${fullPhone}</a></div>
            </div>

            <div class="field-group">
              <div class="label">Country</div>
              <div class="value">${safeCountry}</div>
            </div>

            ${
              safeLinkedin
                ? `
            <div class="field-group">
              <div class="label">LinkedIn Profile</div>
              <div class="value"><a href="${safeLinkedin}" target="_blank" rel="noopener noreferrer">${safeLinkedin}</a></div>
            </div>
            `
                : ""
            }

            ${
              safeTelegram
                ? `
            <div class="field-group">
              <div class="label">Telegram</div>
              <div class="value">${safeTelegram.startsWith("@") ? `<a href="https://t.me/${safeTelegram.slice(1)}" target="_blank">${safeTelegram}</a>` : safeTelegram}</div>
            </div>
            `
                : ""
            }

            <div class="field-group">
              <div class="label">Source / Origin</div>
              <div class="value" style="font-size: 13px; color: #64748b;">${safeSource}</div>
            </div>

            <div class="field-group">
              <div class="label">Submission Timestamp</div>
              <div class="value" style="font-size: 13px; color: #64748b;">${new Date().toUTCString()}</div>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px;">Delivered to <strong>${receiverEmail}</strong> via Hostinger Webmail</p>
            <p style="margin: 0;">Reply directly to this email to contact <strong>${safeName}</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const plainText = `
New StudyGrinder Registration:
---------------------------------------------
Name: ${safeName}
Email: ${safeEmail}
Phone: ${fullPhone}
Country: ${safeCountry}
Course: ${safeCourse}
Course Code: ${safeCourseCode || "N/A"}
LinkedIn: ${safeLinkedin || "N/A"}
Telegram: ${safeTelegram || "N/A"}
Source: ${safeSource}
Timestamp: ${new Date().toISOString()}
---------------------------------------------
Reply to this email directly to answer the candidate.
    `.trim();

    // 3. SEND EMAIL VIA HOSTINGER SMTP
    const transporter = createHostingerTransporter();
    let emailSentSuccessfully = false;

    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"StudyGrinder Admissions" <${smtpUser}>`,
          to: receiverEmail,
          replyTo: safeEmail,
          subject: `🎓 New Registration: ${safeCourse} — ${safeName}`,
          text: plainText,
          html: htmlContent,
        });

        emailSentSuccessfully = true;
        console.log(`✅ Registration email delivered to ${receiverEmail} for: ${safeName}`);

        if (savedRegistration) {
          await Registration.findByIdAndUpdate(savedRegistration._id, {
            emailStatus: "sent",
          });
        }
      } catch (smtpErr) {
        console.error("❌ Hostinger SMTP send error:", smtpErr.message || smtpErr);
        if (savedRegistration) {
          await Registration.findByIdAndUpdate(savedRegistration._id, {
            emailStatus: "failed",
            emailError: smtpErr.message || String(smtpErr),
          });
        }
      }
    } else {
      console.warn(
        "⚠️ EMAIL_USER or EMAIL_PASS not configured. Registration saved to DB but email notification skipped."
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Thank you! Your registration has been received successfully. Our admissions team will reach out to you shortly.",
      registrationId: savedRegistration?._id,
      emailDelivered: emailSentSuccessfully,
    });
  } catch (error) {
    console.error("❌ Registration endpoint error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again or contact register@studygrinder.com directly.",
    });
  }
});

/**
 * GET /registration
 * View recent registrations (can be queried by admin)
 */
registrationRouter.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Registration.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Registration.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching registrations:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default registrationRouter;
