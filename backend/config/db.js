// ============================================================
// FILE: backend/config/db.js  — FULLY FIXED VERSION
//
// FIXES APPLIED:
//  FIX 1 — Added retry logic: if MongoDB connection fails,
//           retries up to 5 times with 5s delay before exiting.
//           Prevents server crash on temporary network blips.
//  FIX 2 — Added all recommended Mongoose connection options
//           for stability (serverSelectionTimeoutMS, etc.)
//  FIX 3 — Added connection event listeners for monitoring:
//           connected, disconnected, reconnected, error
//  FIX 4 — MONGO_URI validation with clear error message
//           showing exact env var name expected
//  FIX 5 — Exported getConnectionStatus() helper so health
//           check endpoint can report DB state without extra
//           mongoose import in server.js
// ============================================================

const mongoose = require("mongoose");

// ─── Connection State ─────────────────────────────────────────
let isConnected = false;
let retryCount  = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

// ─── Mongoose Global Settings ─────────────────────────────────
// Suppress deprecation warnings
mongoose.set("strictQuery", false);

// ─── Connection Options ───────────────────────────────────────
const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 10000, // 10s to find a server
  socketTimeoutMS:          45000, // 45s for socket timeout
  connectTimeoutMS:         10000, // 10s for initial connection
  maxPoolSize:              10,    // max 10 concurrent connections
  minPoolSize:              2,     // keep at least 2 connections open
  retryWrites:              true,
  retryReads:               true,
  heartbeatFrequencyMS:     30000, // check connection every 30s
};

// ─── Event Listeners ─────────────────────────────────────────
mongoose.connection.on("connected", () => {
  isConnected = true;
  retryCount  = 0;
  console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
});

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("⚠️  MongoDB disconnected — will attempt reconnect automatically");
});

mongoose.connection.on("reconnected", () => {
  isConnected = true;
  console.log("✅ MongoDB reconnected successfully");
});

mongoose.connection.on("error", (err) => {
  isConnected = false;
  console.error("❌ MongoDB connection error:", err.message);
});

// ─── Main Connect Function ────────────────────────────────────
const connectDB = async () => {
  // Validate env variable
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not defined in your .env file");
    console.error("   Add this line to backend/.env:");
    console.error("   MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/biodiversity_db");
    process.exit(1);
  }

  // Mask password in logs for security
  const maskedURI = process.env.MONGO_URI.replace(/:([^@]+)@/, ":****@");
  console.log(`🔌 Connecting to MongoDB: ${maskedURI}`);

  try {
    await mongoose.connect(process.env.MONGO_URI, MONGO_OPTIONS);
    // "connected" event above handles the success log
  } catch (error) {
    isConnected = false;
    retryCount++;

    console.error(`❌ MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);

    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying in ${RETRY_DELAY / 1000}s...`);
      setTimeout(connectDB, RETRY_DELAY);
    } else {
      console.error(`❌ MongoDB failed after ${MAX_RETRIES} attempts. Exiting.`);
      console.error("   Check your MONGO_URI and network connection.");
      process.exit(1);
    }
  }
};

// ─── Health Status Helper ─────────────────────────────────────
// Used by /health endpoint to report DB status
const getConnectionStatus = () => ({
  isConnected,
  state: mongoose.connection.readyState,
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  stateLabel: ["disconnected", "connected", "connecting", "disconnecting"][
    mongoose.connection.readyState
  ] || "unknown",
  host: mongoose.connection.host || null,
  dbName: mongoose.connection.name || null,
});

module.exports = connectDB;
module.exports.getConnectionStatus = getConnectionStatus;