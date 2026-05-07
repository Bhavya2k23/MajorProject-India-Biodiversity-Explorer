/**
 * Backend Logger Utility
 * Structured JSON logging with service context and log levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

const serialize = (obj) => {
  if (typeof obj === 'object' && obj !== null) {
    if (obj instanceof Error) {
      return {
        message: obj.message,
        name: obj.name,
        stack: obj.stack,
      };
    }
    return obj;
  }
  return String(obj);
};

const formatLog = (level, service, message, meta = {}) => ({
  timestamp: new Date().toISOString(),
  level,
  service,
  message,
  ...meta,
});

const logger = {
  error: (service, message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(JSON.stringify(formatLog('ERROR', service, message, serialize(meta))));
    }
  },

  warn: (service, message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(JSON.stringify(formatLog('WARN', service, message, serialize(meta))));
    }
  },

  info: (service, message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.info(JSON.stringify(formatLog('INFO', service, message, serialize(meta))));
    }
  },

  debug: (service, message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.debug(JSON.stringify(formatLog('DEBUG', service, message, serialize(meta))));
    }
  },

  // Utility for logging API requests
  api: {
    request: (service, method, path, meta = {}) => {
      logger.debug(service, `API Request: ${method} ${path}`, { method, path, ...meta });
    },
    response: (service, method, path, statusCode, duration, meta = {}) => {
      const level = statusCode >= 400 ? 'warn' : 'debug';
      logger[level](service, `API Response: ${method} ${path} -> ${statusCode}`, {
        method,
        path,
        statusCode,
        durationMs: duration,
        ...meta,
      });
    },
    error: (service, method, path, error, duration) => {
      logger.error(service, `API Error: ${method} ${path}`, {
        method,
        path,
        error: error.message || String(error),
        durationMs: duration,
      });
    },
  },
};

module.exports = logger;