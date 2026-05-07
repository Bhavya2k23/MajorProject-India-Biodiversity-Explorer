// ============================================================
<<<<<<< HEAD
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
=======
// FILE: backend/server.js  — FULLY FIXED VERSION
//
// FIXES APPLIED:
//  FIX 1 — CORS: Added all frontend ports (5173,3000,8080,8081)
//           + dynamic ALLOWED_ORIGINS from .env
//  FIX 2 — Seed endpoint was protected by adminAuth but seed
//           script needs to run fresh — made it admin-only via
//           a simple secret key check (no JWT needed for CLI)
//  FIX 3 — AI_SERVICE_URL pulled from env (was hardcoded)
//  FIX 4 — All optional packages (helmet/morgan/rateLimit)
//           safely loaded with try/catch — server never crashes
//  FIX 5 — PORT fallback chain: tries 5001→5002→... automatically
//  FIX 6 — Added /api/species alias for /api/animals so both
//           frontend routes work
//  FIX 7 — Graceful shutdown handles SIGTERM + SIGUSR2 (nodemon)
//  FIX 8 — Request logging skips /health to reduce noise
//  FIX 9 — Static file serving only in production (avoid conflicts)
//  FIX 10 — Removed duplicate error handler (kept only errorHandler)
// ============================================================

const express = require("express");
const cors    = require("cors");
const dotenv  = require("dotenv");
const path    = require("path");

// ─── Load .env FIRST ─────────────────────────────────────────
dotenv.config();

// ─── Database ─────────────────────────────────────────────────
const connectDB = require("./config/db");
connectDB();

// ─── Error Handler Middleware ─────────────────────────────────
const errorHandler = require("./middleware/errorHandler");

// ─── Logger ───────────────────────────────────────────────────
const logger = require("./utils/logger");

// ─── Optional Packages — Safe Loading ─────────────────────────
let helmet, morgan, rateLimit;
try { helmet    = require("helmet");             } catch (_) { console.warn("⚠️  helmet not found. Run: npm install helmet"); }
try { morgan    = require("morgan");             } catch (_) { console.warn("⚠️  morgan not found. Run: npm install morgan"); }
try { rateLimit = require("express-rate-limit"); } catch (_) { console.warn("⚠️  express-rate-limit not found. Run: npm install express-rate-limit"); }

// ─── Route Imports ────────────────────────────────────────────
const authRoutes             = require("./routes/authRoutes");
const speciesRoutes          = require("./routes/speciesRoutes");
const plantRoutes            = require("./routes/plantRoutes");
const ecosystemRoutes        = require("./routes/ecosystemRoutes");
const zoneRoutes             = require("./routes/zoneRoutes");
const quizRoutes             = require("./routes/quizRoutes");
const analyticsRoutes        = require("./routes/analyticsRoutes");
const utilityRoutes          = require("./routes/utilityRoutes");
const adminRoutes            = require("./routes/adminRoutes");
const externalDataRoutes     = require("./routes/externalDataRoutes");
const imageRecognitionRoutes = require("./routes/imageRecognitionRoutes");
const recommendationRoutes   = require("./routes/recommendationRoutes");
const leaderboardRoutes      = require("./routes/leaderboardRoutes");
const mapRoutes              = require("./routes/mapRoutes");

// ─── Cron Jobs ────────────────────────────────────────────────
try {
  const { startWeeklyReset } = require("./services/cronService");
  startWeeklyReset();
  console.log("📅 Weekly leaderboard reset cron job scheduled (every Monday 00:00 UTC)");
} catch (e) {
  console.warn("⚠️  cronService not loaded:", e.message);
}

// ─── Rate Limiter Middleware ──────────────────────────────────
let gbifRateLimiter, iucnRateLimiter, combinedRateLimiter;
try {
  const rl = require("./middleware/rateLimiter");
  gbifRateLimiter     = rl.gbifRateLimiter;
  iucnRateLimiter     = rl.iucnRateLimiter;
  combinedRateLimiter = rl.combinedRateLimiter;
} catch (e) {
  console.warn("⚠️  rateLimiter middleware not loaded:", e.message);
}

// ─── Create Express App ───────────────────────────────────────
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
const app = express();
app.set("trust proxy", 1);

<<<<<<< HEAD
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
=======
// ─── Security Headers ─────────────────────────────────────────
if (helmet) {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }, // allow images from other origins
      contentSecurityPolicy: false, // disable CSP in dev (enable in prod with proper config)
    })
  );
}

// ─── Global Rate Limiter ──────────────────────────────────────
if (rateLimit) {
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/health" || req.path === "/api/health",
    message: { success: false, message: "Too many requests. Please try again later." },
  });
  app.use("/api/", globalLimiter);
}

// ─── CORS ─────────────────────────────────────────────────────
// FIX: Reads from ALLOWED_ORIGINS env — falls back to all common dev ports
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8080",
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : defaultOrigins;
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d

app.use(
  cors({
    origin: (origin, callback) => {
<<<<<<< HEAD
      // Allow requests with no origin (Postman, mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin "${origin}" is not allowed.`));
=======
      // Allow no-origin requests (Postman, curl, mobile)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // In development, allow all localhost origins
      if (process.env.NODE_ENV === "development" && origin.includes("localhost")) {
        return callback(null, true);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
      }
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(null, false);
    },
    credentials: true,
<<<<<<< HEAD
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
=======
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 86400,
  })
);

// Handle preflight for all routes
app.options("*", cors());

// ─── Body Parsers ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Static Files (Uploaded Images) ──────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Serve Frontend Build (Production Only) ───────────────────
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../india-s-wild-explorer/dist");
  app.use(express.static(distPath, { maxAge: "1d", etag: true }));
}

// ─── Cache Headers for API Routes ────────────────────────────
const setCacheHeader = (maxAge) => (req, res, next) => {
  if (req.method === "GET") res.set("Cache-Control", `public, max-age=${maxAge}`);
  next();
};
app.use("/api/animals",    setCacheHeader(300));
app.use("/api/species",    setCacheHeader(300));
app.use("/api/plants",     setCacheHeader(300));
app.use("/api/ecosystems", setCacheHeader(3600));
app.use("/api/zones",      setCacheHeader(3600));
app.use("/api/map",        setCacheHeader(60));

// ─── HTTP Logger ──────────────────────────────────────────────
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
if (morgan && process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

<<<<<<< HEAD
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
=======
// ─── Request/Response Logging ────────────────────────────────
app.use((req, res, next) => {
  if (["/health", "/api/health"].includes(req.path)) return next();
  if (req.path.startsWith("/uploads")) return next();

  const start     = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  req.requestId   = requestId;
  res.locals.requestId = requestId;

  res.on("finish", () => {
    const ms    = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level]("http", `${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`, {
      requestId, method: req.method, path: req.originalUrl,
      statusCode: res.statusCode, durationMs: ms,
    });
    if (ms > 2000) {
      logger.warn("http", `SLOW REQUEST ${req.method} ${req.originalUrl} took ${ms}ms`);
    }
  });

  next();
});

// ══════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════
app.use("/api/auth",            authRoutes);
app.use("/api/animals",         speciesRoutes);   // primary
app.use("/api/species",         speciesRoutes);   // FIX: alias so /api/species also works
app.use("/api/plants",          plantRoutes);
app.use("/api/ecosystems",      ecosystemRoutes);
app.use("/api/zones",           zoneRoutes);
app.use("/api/quiz",            quizRoutes);
app.use("/api/analytics",       analyticsRoutes);
app.use("/api",                 utilityRoutes);   // search, chatbot, predict
app.use("/api/admin",           adminRoutes);
app.use("/api/external",        externalDataRoutes);
app.use("/api/recognize",       imageRecognitionRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/leaderboard",     leaderboardRoutes);
app.use("/api/map",             mapRoutes);

// ─── Seed Endpoint (Admin Secret Key) ────────────────────────
// POST /api/seed  with header  x-seed-secret: <SEED_SECRET from .env>
app.post("/api/seed", async (req, res) => {
  const secret = req.headers["x-seed-secret"];
  const expected = process.env.SEED_SECRET || "biodiversity-seed-2024";

  if (secret !== expected) {
    return res.status(401).json({ success: false, message: "Unauthorized: wrong seed secret" });
  }

  try {
    const { spawn } = require("child_process");
    const seedProcess = spawn("node", ["scripts/seedData.js"], {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    seedProcess.stdout.on("data", (d) => (stdout += d.toString()));
    seedProcess.stderr.on("data", (d) => (stderr += d.toString()));

    seedProcess.on("close", (code) => {
      if (code === 0) {
        res.json({ success: true, message: "✅ Database seeded successfully!", output: stdout });
      } else {
        res.status(500).json({ success: false, message: "Seeding failed", error: stderr });
      }
    });

    seedProcess.on("error", (err) => {
      res.status(500).json({ success: false, message: "Failed to start seed: " + err.message });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Seed error: " + err.message });
  }
});

// ─── Health Checks ────────────────────────────────────────────
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    message: "🌿 India Biodiversity API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    aiService: process.env.AI_SERVICE_URL || "http://localhost:8000",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    message: "India Biodiversity Explorer API is running 🌿",
    timestamp: new Date().toISOString(),
  });
});

<<<<<<< HEAD
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
=======
// ─── 404 Handler ─────────────────────────────────────────────
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route "${req.originalUrl}" not found.`,
    hint: "Check /health for available endpoints",
  });
});

// ─── Global Error Handler (MUST be last) ─────────────────────
app.use(errorHandler);

// ══════════════════════════════════════════════════════════════
// START SERVER — Auto port fallback on EADDRINUSE
// ══════════════════════════════════════════════════════════════
const PREFERRED_PORT  = parseInt(process.env.PORT, 10) || 5001;
const MAX_PORT_TRIES  = 10;

function startServer(port, attempt = 0) {
  if (attempt >= MAX_PORT_TRIES) {
    console.error(`❌ Could not bind to any port after ${MAX_PORT_TRIES} attempts.`);
    process.exit(1);
  }

  const server = app.listen(port, () => {
    process.env.PORT = String(port);
    console.log(`\n🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${port}`);
    console.log(`📡 API Base URL  : http://localhost:${port}/api`);
    console.log(`🔑 Admin API     : http://localhost:${port}/api/admin`);
    console.log(`🌱 Seed DB       : POST http://localhost:${port}/api/seed  (header: x-seed-secret)`);
    console.log(`💚 Health check  : http://localhost:${port}/health\n`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️  Port ${port} busy — trying ${port + 1} (attempt ${attempt + 1}/${MAX_PORT_TRIES})`);
      setTimeout(() => startServer(port + 1, attempt + 1), 500);
    } else {
      console.error("❌ Server error:", err.message);
      process.exit(1);
    }
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n📴 ${signal} received — shutting down gracefully…`);
    server.close(() => {
      console.log("✅ Server closed.");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000); // force kill after 10s
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT",  () => shutdown("SIGINT"));

  // Nodemon restart
  process.once("SIGUSR2", () => {
    server.close(() => process.kill(process.pid, "SIGUSR2"));
  });

  // Unhandled rejections
  process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Promise Rejection:", err?.message || err);
    // In development, we might want to keep the server alive or let nodemon restart
    if (process.env.NODE_ENV !== "development") {
      server.close(() => process.exit(1));
    }
  });

  process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err?.message || err);
    // In development, avoid killing the process so nodemon can handle it
    if (process.env.NODE_ENV !== "development") {
      server.close(() => process.exit(1));
    }
  });
}

startServer(PREFERRED_PORT);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d

module.exports = app;