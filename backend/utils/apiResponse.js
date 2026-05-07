/**
 * Standardized API Response Wrapper
 * Ensures consistent data structure across all endpoints
 */
const sendResponse = (res, statusCode, data, message = "Request processed successfully", success = true) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || 'N/A'
  });
};

module.exports = { sendResponse };
