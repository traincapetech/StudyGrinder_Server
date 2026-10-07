import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const smtpUser = process.env.EMAIL_USER;
const smtpPass = process.env.EMAIL_PASS;
const host = process.env.SMTP_HOST || "smtp.hostinger.com";
const port = Number(process.env.SMTP_PORT) || 465;
const isSecure = port === 465;

console.log("==========================================");
console.log("🔍 Hostinger SMTP Connection Diagnostics");
console.log("==========================================");
console.log(`Host:     ${host}`);
console.log(`Port:     ${port} (Secure: ${isSecure})`);
console.log(`User:     ${smtpUser || "(NOT SET)"}`);
console.log(`Password: ${smtpPass ? "******** (" + smtpPass.length + " chars)" : "(NOT SET)"}`);
console.log("------------------------------------------");

if (!smtpUser || !smtpPass) {
  console.error("❌ ERROR: EMAIL_USER or EMAIL_PASS is missing in server/.env");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: isSecure,
  family: 4,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

console.log("⏳ Verifying SMTP credentials with Hostinger...");

transporter.verify(async (error, success) => {
  if (error) {
    console.error("\n❌ AUTHENTICATION FAILED:");
    console.error(error.message);
    console.log("\n💡 Troubleshooting Tips:");
    console.log("1. Check if you can log in to https://mail.hostinger.com with this exact username and password.");
    console.log("2. Make sure the mailbox 'register@studygrinder.com' was actually created in Hostinger hPanel -> Emails.");
    console.log("3. If your password has special characters ($ # & \" '), wrap it in double quotes in server/.env:");
    console.log('   EMAIL_PASS="your_password_here"');
    console.log("4. If port 465 fails, try SMTP_PORT=587 in server/.env.");
    process.exit(1);
  } else {
    console.log("\n✅ SMTP LOGIN SUCCESSFUL! Hostinger accepted your credentials.");
    console.log("⏳ Sending test email to:", smtpUser);

    try {
      const info = await transporter.sendMail({
        from: `"StudyGrinder System" <${smtpUser}>`,
        to: smtpUser,
        subject: "🎉 Hostinger SMTP Connected Successfully - StudyGrinder",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
            <h2 style="color: #2563eb;">StudyGrinder SMTP Verification</h2>
            <p>Your Hostinger webmail SMTP connection is working perfectly!</p>
            <p><strong>Configured Mailbox:</strong> ${smtpUser}</p>
            <p><strong>Host:</strong> ${host}:${port}</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
        `,
      });

      console.log(`✅ Test email delivered successfully! Message ID: ${info.messageId}`);
      console.log("🎉 You are ready to receive live student registration emails.");
      process.exit(0);
    } catch (sendErr) {
      console.error("\n❌ Failed to send test email:", sendErr.message);
      process.exit(1);
    }
  }
});
