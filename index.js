import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db.js";
import { createServer } from 'http';
import { initSocket, setIO } from './socket/socketManager.js';


// Routers
import { userRouter } from "./routes/user.routes.js";
import { reviewRouter } from "./routes/review.routes.js";
import { bookRouter } from "./routes/book.routes.js";
import { questionRouter } from "./routes/question.routes.js";
import { resultRouter } from "./routes/result.routes.js";
import { employeeRouter } from "./routes/employee.routes.js";
import certificateRouter from "./routes/certificate.routes.js";
import voucherRouter from "./routes/voucher.routes.js";
import { securityRouter } from "./routes/security.routes.js";
import { contactRouter } from "./routes/contact.routes.js";
import { requestHumanHandover } from "./controllers/chat.controller.js";
import chatRouter from "./routes/chat.routes.js";
import consultantRouter from "./routes/consultant.routes.js";
import internRouter from "./routes/intern.routes.js";
import { videoCourseRouter } from "./routes/videoCourse.routes.js";

import registrationRouter from "./routes/registration.routes.js";

dotenv.config();

// ✅ Check for required environment variables
if (!process.env.SECRET_KEY) {
  console.warn("⚠️ WARNING: SECRET_KEY environment variable is not set. Defaulting to a development fallback key.");
}

const app = express();

// ✅ Enhanced CORS Configuration
const allowedOrigins = [
  'https://studygrinder.com',
  'https://www.studygrinder.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://localhost:3006',
  'http://localhost:8080'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = allowedOrigins.includes(origin);
    const isStudyGrinderDomain = /\.studygrinder\.com$/.test(origin) || origin === 'https://studygrinder.com';
    const isVercelPreview = /\.vercel\.app$/.test(origin);

    if (isExplicitlyAllowed || isStudyGrinderDomain || isVercelPreview) {
      callback(null, true);
    } else {
      console.warn('⚠️ Origin blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// For webhooks we need raw body; apply conditionally for the webhook route
app.use(express.json());

// ✅ Disable ETag to avoid 304 stale responses for dynamic content
app.set('etag', false);

// ✅ Static Files
app.use("/uploads", express.static("uploads"));

// ✅ Health Check Endpoint (Render & Uptime Monitors)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "StudyGrinder API",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ✅ Routes
app.use("/registration", registrationRouter);
app.use("/api/registration", registrationRouter);
app.use("/questions", questionRouter);
app.use("/employees", employeeRouter);
app.use("/results", resultRouter);
app.use("/users", userRouter);
app.use("/review", reviewRouter);
app.use("/books", bookRouter);
app.use("/certificates", certificateRouter);
app.use("/vouchers", voucherRouter);
app.use("/security", securityRouter);
app.use("/contact", contactRouter);
app.use("/chat", chatRouter);
app.use("/consultant", consultantRouter);
app.use("/interns", internRouter);
app.use("/video-courses", videoCourseRouter);

// ✅ Home Endpoint
app.get("/", (req, res) => {
  res.status(200).send({
    message: "Welcome to StudyGrinder API",
  });
});

// ✅ Server Bootstrap
const PORT = process.env.PORT || 3001;



// ...

const httpServer = createServer(app);
const io = initSocket(httpServer);
setIO(io);

const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌐 Frontend URL configured: ${process.env.FRONTEND_URL || 'Not set'}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
