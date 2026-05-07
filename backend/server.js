// ============================================================
// FILE: backend/server.js
//
// FIXES APPLIED:
//   BUG 1 — DUPLICATE DB: connectDB() AND mongoose.connect() both
//            called. MongoDB was connecting twice, wasting connections.
//            REMOVED the redundant mongoose.connect() block.
//   BUG 2 — Dead import: mongoose was only used for the duplicate
//            connection, which is now removed. REMOVED mongoose import.
//   BUG 3 — DUPLICATE error handler: inline (err,req,res,next) AND
//            app.use(errorHandler) both registered. Express executes
//            only the first matching error handler — the second one
//            was silently dead code. REMOVED inline handler, kept
//            app.use(errorHandler) which uses your existing middleware.
//   BUG 4 — Hard require() for optional packages (helmet, morgan,
//            rateLimit): server CRASHES on startup if any of these
//            are not installed. Wrapped each in try/catch with a
//            clear install hint in the console warning.
//   BUG 5 — CORS methods list was missing "PATCH": the admin
//            coordinate update endpoint uses PATCH and was being
//            blocked by CORS preflight. Added "PATCH" to methods.
// ============================================================

const express    = require("express");
const cors       = require("cors");
const dotenv     = require("dotenv");
const path       = require("path");

// ─── Load .env FIRST (must be before any process.env reads) ───
dotenv.config();

// ─── Database — single connection only ────────────────────────
const connectDB = require("./config/db");
connectDB();
// NOTE: Do NOT add a second mongoose.connect() call here.
//       connectDB() in config/db.js handles the connection fully.

// ─── Existing middleware ───────────────────────────────────────
const errorHandler = require("./middleware/errorHandler");

// ─── Optional packages — safe loading ─────────────────────────
// If any of these are missing, the server still starts normally.
// Install them all with: npm install helmet morgan express-rate-limit
let helmet, morgan, rateLimit;

try {
  helmet = require("helmet");
} catch (_) {
  console.warn("⚠️  helmet not installed (optional). Run: npm install helmet");
}
try {
  morgan = require("morgan");
} catch (_) {
  console.warn("⚠️  morgan not installed (optional). Run: npm install morgan");
}
try {
  rateLimit = require("express-rate-limit");
} catch (_) {
  console.warn("⚠️  express-rate-limit not installed (optional). Run: npm install express-rate-limit");
}

// ─── Route Imports ─────────────────────────────────────────────
const authRoutes      = require("./routes/authRoutes");
const speciesRoutes   = require("./routes/speciesRoutes");
const plantRoutes     = require("./routes/plantRoutes");
const ecosystemRoutes = require("./routes/ecosystemRoutes");
const zoneRoutes      = require("./routes/zoneRoutes");
const quizRoutes      = require("./routes/quizRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const utilityRoutes   = require("./routes/utilityRoutes");
const adminRoutes     = require("./routes/adminRoutes");

// ─── Create Express app ────────────────────────────────────────
const app = express();

// ─── Security: Helmet ─────────────────────────────────────────
if (helmet) {
  app.use(helmet());
}

// ─── Rate Limiting ─────────────────────────────────────────────
if (rateLimit) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
    },
  });
  app.use("/api/", limiter);
}

// ─── CORS ──────────────────────────────────────────────────────
// FIX: Added "PATCH" to methods — required by PATCH /map/species/:id/coordinates
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin "${origin}" is not allowed.`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // PATCH added
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Body Parsers ──────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Static file serving (uploaded images) ─────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── HTTP logger (development only) ────────────────────────────
if (morgan && process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ══════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════

// Existing public API routes
app.use("/api/auth",       authRoutes);
app.use("/api/animals",    speciesRoutes);
app.use("/api/plants",     plantRoutes);
app.use("/api/ecosystems", ecosystemRoutes);
app.use("/api/zones",      zoneRoutes);
app.use("/api/quiz",       quizRoutes);
app.use("/api/analytics",  analyticsRoutes);
app.use("/api",            utilityRoutes); // search, chatbot, predict

// Admin routes
app.use("/api/admin", adminRoutes);

// ─── Health check endpoints ────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🌿 Biodiversity Intelligence Platform API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "India Biodiversity Explorer API is running 🌿",
    timestamp: new Date().toISOString(),
  });
});

// ══════════════════════════════════════════════════════════════
// ERROR HANDLING — must always be registered LAST
// ══════════════════════════════════════════════════════════════

// 404 — unknown routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route "${req.originalUrl}" not found.`,
  });
});

// Global error handler — ONE handler only.
// FIX: Removed the duplicate inline (err,req,res,next) handler.
//      Express stops at the first matching error middleware, so
//      having two caused the second one to be silently dead code.
//      This single app.use(errorHandler) is the source of truth.
app.use(errorHandler);

// ══════════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  console.log(`📡 API Base URL  : http://localhost:${PORT}/api`);
  console.log(`📊 Admin API     : http://localhost:${PORT}/api/admin`);
  console.log(`🌱 Seed admin    : POST http://localhost:${PORT}/api/admin/auth/seed`);
  console.log(`💚 Health check  : http://localhost:${PORT}/health\n`);
});

// Graceful shutdown on unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err.message);
  server.close(() => process.exit(1));
});

module.exports = app;