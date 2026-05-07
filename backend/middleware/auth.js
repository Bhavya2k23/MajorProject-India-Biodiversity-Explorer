const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendResponse } = require("../utils/apiResponse");

// ─── Protect routes — verify JWT ────────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check Authorization header (Bearer token)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2. Fallback: check cookie (for browser sessions)
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return sendResponse(res, 401, null, "Not authorized. Please log in to access this resource.", false);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      // Distinguish between expired and invalid tokens
      if (jwtErr.name === "TokenExpiredError") {
        return sendResponse(res, 401, null, "Session expired. Please log in again.", false);
      }
      return sendResponse(res, 401, null, "Invalid token. Please log in again.", false);
    }

    // Find user
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return sendResponse(res, 401, null, "Account not found. Please log in again.", false);
    }

    // Check if user is active (if your User model has isActive field)
    if (user.isActive === false) {
      return sendResponse(res, 401, null, "Account is deactivated. Please contact support.", false);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[Auth] Unexpected error in protect middleware:", error.message);
    return sendResponse(res, 500, null, "Authentication error. Please try again.", false);
  }
};

// ─── Admin only middleware ───────────────────────────────────────
exports.adminOnly = (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, null, "Not authenticated.", false);
  }

  // Support both "admin" string and role arrays
  const isAdmin =
    req.user.role === "admin" ||
    req.user.isAdmin === true ||
    (Array.isArray(req.user.roles) && req.user.roles.includes("admin"));

  if (!isAdmin) {
    return sendResponse(res, 403, null, "Access denied. Admin privileges required.", false);
  }

  next();
};

// ─── Optional auth — attaches user if token present, doesn't fail ──
// Use this on routes that work for both guests and logged-in users
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      req.user = null;
      return next(); // No token is fine — just proceed as guest
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
  } catch {
    req.user = null; // Invalid token — treat as guest, don't fail
  }

  next();
};
