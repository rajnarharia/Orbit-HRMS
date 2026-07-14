// server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const store = require("./db/store");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const attendanceRoutes = require("./routes/attendance");
const leaveRoutes = require("./routes/leave");
const salaryRoutes = require("./routes/salary");
const resumeRoutes = require("./routes/resume");
const photoRoutes = require("./routes/photo");
const chatRoutes = require("./routes/chat");

const app = express();

const PORT = process.env.PORT || 5000;

// ======================
// CORS FIX
// ======================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://odoo-hr-management-system.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
  })
);

// ======================
// Body Parser
// ======================

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// ======================
// Static Upload Folder
// ======================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ======================
// Seed Demo Data
// ======================

store.seedIfEmpty();

// ======================
// Root Route
// ======================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Orbit HRMS Backend Running 🚀",
    version: "1.0.0",
  });
});

// ======================
// Health Check
// ======================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "Orbit HRMS API",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// ======================
// API Routes
// ======================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/photo", photoRoutes);
app.use("/api/chat", chatRoutes);

// ======================
// 404 Route Handler
// ======================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ======================
// Global Error Handler
// ======================

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  // Multer upload errors
  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // File validation errors
  if (err.message?.includes("Only image files")) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }

  // Token expired
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Token expired",
    });
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// ======================
// Start Server
// ======================

app.listen(PORT, () => {
  console.log("\n==================================");
  console.log(`🚀 Orbit HRMS Backend Running`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log("==================================");

  console.log("\n👨‍💼 Demo Admin Login");
  console.log("Email    : admin@hrms.com");
  console.log("Password : Admin@123");

  console.log("\n👨‍💻 Demo Employee Login");
  console.log("Email    : priya.sharma@hrms.com");
  console.log("Password : Welcome@123");

  console.log("\n✅ Backend Ready\n");
});