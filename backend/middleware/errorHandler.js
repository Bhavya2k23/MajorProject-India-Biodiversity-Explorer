/**
 * Centralized Error Handler
 * Handles all errors in a structured way with consistent JSON responses
 */
const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let code = "INTERNAL_ERROR";

  // Log the error with structured logging
  logger.error("errorHandler", `Error processing request: ${req.method} ${req.originalUrl}`, {
    statusCode,
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    body: req.body ? JSON.stringify(req.body).slice(0, 200) : undefined,
    query: req.query,
    ip: req.ip,
  });

  // Mongoose bad ObjectId (invalid ID format)
  if (err.name === "CastError") {
    statusCode = 404;
    message = `Resource not found with id: ${err.value}`;
    code = "NOT_FOUND";
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}`;
    code = "DUPLICATE_ERROR";
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    code = "VALIDATION_ERROR";
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    code = "INVALID_TOKEN";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    code = "TOKEN_EXPIRED";
  }

  // SyntaxError (malformed JSON in request body)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    message = "Malformed JSON in request body";
    code = "MALFORMED_JSON";
  }

  // Request entity too large
  if (err.type === "entity.parse.failed" || err.status === 413) {
    statusCode = 413;
    message = "Request payload too large";
    code = "PAYLOAD_TOO_LARGE";
  }

  // MongoDB BSON parsing error
  if (err.name === "BSONError" || err.message?.includes("BSON")) {
    statusCode = 400;
    message = "Invalid data format";
    code = "INVALID_DATA_FORMAT";
  }

  // Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    message = "File too large";
    code = "FILE_TOO_LARGE";
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    statusCode = 400;
    message = "Unexpected file field";
    code = "UNEXPECTED_FILE";
  }

  // CORS errors
  if (err.message?.includes("CORS")) {
    statusCode = 403;
    message = "Cross-origin request blocked";
    code = "CORS_ERROR";
  }

  // Rate limit errors
  if (err.statusCode === 429 || err.message?.includes("rate limit")) {
    statusCode = 429;
    message = "Too many requests, please try again later";
    code = "RATE_LIMITED";
  }

  // Send response
  const response = {
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
