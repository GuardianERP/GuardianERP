/**
 * Guardian Desktop ERP - Frontend Error Service
 * Error handling and logging for React application
 */

// Log levels
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

// Error categories
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTH: 'authentication',
  PERMISSION: 'permission',
  UI: 'ui',
  UNKNOWN: 'unknown',
};

// In-memory log buffer for display
const logBuffer = [];
const MAX_BUFFER_SIZE = 1000;

// Error listeners
const errorListeners = new Set();

/**
 * Format log entry
 */
function formatLogEntry(level, message, data = null) {
  const entry = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };
  
  // Add to buffer
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift();
  }
  
  return entry;
}

/**
 * Send log to main process (if available)
 */
function sendToMain(entry) {
  if (window.electronAPI?.log) {
    window.electronAPI.log(entry.level, entry.message, entry.data);
  }
}

/**
 * Log to console with appropriate method
 */
function logToConsole(entry) {
  const { level, message, data } = entry;
  const consoleMethod = console[level] || console.log;
  
  if (data) {
    consoleMethod(`[${entry.timestamp}] ${message}`, data);
  } else {
    consoleMethod(`[${entry.timestamp}] ${message}`);
  }
}

/**
 * Main logging function
 */
function log(level, message, data = null) {
  const entry = formatLogEntry(level, message, data);
  logToConsole(entry);
  sendToMain(entry);
  return entry;
}

/**
 * Logger object with level methods
 */
export const logger = {
  debug: (message, data) => log(LOG_LEVELS.DEBUG, message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, message, data),
  warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
  error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
  
  // Get log buffer
  getLogs: (count = 100) => logBuffer.slice(-count),
  
  // Clear log buffer
  clearLogs: () => {
    logBuffer.length = 0;
  },
};

/**
 * Notify error listeners
 */
function notifyErrorListeners(error, context) {
  errorListeners.forEach(listener => {
    try {
      listener(error, context);
    } catch (e) {
      console.error('Error in error listener:', e);
    }
  });
}

/**
 * Handle application error
 */
export function handleError(error, context = {}) {
  const errorInfo = {
    message: error.message || String(error),
    name: error.name || 'Error',
    stack: error.stack,
    category: context.category || ERROR_CATEGORIES.UNKNOWN,
    ...context,
  };
  
  // Log the error
  logger.error(errorInfo.message, errorInfo);
  
  // Notify listeners
  notifyErrorListeners(errorInfo, context);
  
  return errorInfo;
}

/**
 * Handle API/network errors
 */
export function handleApiError(error, endpoint) {
  const context = {
    category: ERROR_CATEGORIES.NETWORK,
    endpoint,
    status: error.response?.status,
    statusText: error.response?.statusText,
  };
  
  // User-friendly messages based on status
  let message = error.message;
  if (error.response) {
    switch (error.response.status) {
      case 400:
        message = 'Invalid request. Please check your input.';
        break;
      case 401:
        message = 'Session expired. Please log in again.';
        context.category = ERROR_CATEGORIES.AUTH;
        break;
      case 403:
        message = 'You don\'t have permission to perform this action.';
        context.category = ERROR_CATEGORIES.PERMISSION;
        break;
      case 404:
        message = 'The requested resource was not found.';
        break;
      case 500:
        message = 'Server error. Please try again later.';
        break;
      default:
        message = `Request failed: ${error.response.statusText}`;
    }
  } else if (error.request) {
    message = 'Network error. Please check your connection.';
  }
  
  return handleError(new Error(message), context);
}

/**
 * Register error listener
 */
export function onError(callback) {
  errorListeners.add(callback);
  return () => errorListeners.delete(callback);
}

/**
 * Create async error handler
 */
export function createAsyncHandler(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  };
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers() {
  // Window error handler
  window.onerror = (message, source, lineno, colno, error) => {
    handleError(error || new Error(message), {
      category: ERROR_CATEGORIES.UI,
      source,
      lineno,
      colno,
    });
    return false; // Let default handler run too
  };
  
  // Unhandled promise rejection
  window.onunhandledrejection = (event) => {
    handleError(event.reason, {
      category: ERROR_CATEGORIES.UNKNOWN,
      type: 'unhandledRejection',
    });
  };
  
  logger.info('Global error handlers initialized');
}

export default {
  logger,
  handleError,
  handleApiError,
  onError,
  createAsyncHandler,
  setupGlobalErrorHandlers,
  LOG_LEVELS,
  ERROR_CATEGORIES,
};
