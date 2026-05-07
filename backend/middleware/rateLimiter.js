/**
 * Specialized Rate Limiter Middleware for External API Calls
 * Implements different rate limits for GBIF, IUCN, and combined endpoints
 */

const rateLimit = require("express-rate-limit");

// ─── Rate Limit Configuration ───────────────────────────────────
const RATE_LIMITS = {
  gbif: {
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 requests per minute per IP
    message: {
      success: false,
      error: "RateLimitError",
      message: "GBIF rate limit exceeded. Max 50 requests/minute.",
      retryAfter: "60 seconds",
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || "unknown";
    },
  },
  iucn: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    message: {
      success: false,
      error: "RateLimitError",
      message: "IUCN rate limit exceeded. Max 100 requests/minute.",
      retryAfter: "60 seconds",
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || "unknown";
    },
  },
  combined: {
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute per IP
    message: {
      success: false,
      error: "RateLimitError",
      message: "Combined API rate limit exceeded. Max 200 requests/minute.",
      retryAfter: "60 seconds",
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || "unknown";
    },
  },
};

// ─── Create Rate Limiters ────────────────────────────────────────
const createRateLimiter = (config) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: config.standardHeaders,
    legacyHeaders: config.legacyHeaders,
    keyGenerator: config.keyGenerator,
    handler: (req, res, next, options) => {
      // Log rate limit hit
      console.error(JSON.stringify({
        type: "RATE_LIMIT_EXCEEDED",
        service: config.message.error,
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString(),
      }));

      // Set Retry-After header
      res.set("Retry-After", Math.ceil(config.windowMs / 1000));

      res.status(429).json(config.message);
    },
  });
};

// ─── Pre-configured Rate Limiters ───────────────────────────────
const gbifRateLimiter = createRateLimiter(RATE_LIMITS.gbif);
const iucnRateLimiter = createRateLimiter(RATE_LIMITS.iucn);
const combinedRateLimiter = createRateLimiter(RATE_LIMITS.combined);

// ─── General API Rate Limiter ────────────────────────────────────
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes per IP
  message: {
    success: false,
    error: "RateLimitError",
    message: "Too many requests. Please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    console.error(JSON.stringify({
      type: "RATE_LIMIT_EXCEEDED",
      service: "general",
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString(),
    }));

    res.set("Retry-After", Math.ceil(15 * 60 * 1000 / 1000));
    res.status(429).json(options.message);
  },
});

// ─── Cache Management Rate Limiter (stricter for admin endpoints) ─
const cacheManagementRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Only 10 cache operations per minute
  message: {
    success: false,
    error: "RateLimitError",
    message: "Too many cache operations. Please try again later.",
    retryAfter: "60 seconds",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    console.error(JSON.stringify({
      type: "RATE_LIMIT_EXCEEDED",
      service: "cache_management",
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString(),
    }));

    res.set("Retry-After", "60");
    res.status(429).json(options.message);
  },
});

module.exports = {
  gbifRateLimiter,
  iucnRateLimiter,
  combinedRateLimiter,
  generalRateLimiter,
  cacheManagementRateLimiter,
  RATE_LIMITS,
};
