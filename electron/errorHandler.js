/**
 * Guardian Desktop ERP - Error Handler Service
 * Centralized error handling for both main and renderer processes
 */

import logger from './logger.js';

// Error categories
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  DATABASE: 'database',
  VALIDATION: 'validation',
  AUTH: 'authentication',
  PERMISSION: 'permission',
  SYSTEM: 'system',
  UNKNOWN: 'unknown',
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Custom application error class
export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.category = options.category || ERROR_CATEGORIES.UNKNOWN;
    this.severity = options.severity || ERROR_SEVERITY.MEDIUM;
    this.code = options.code || 'ERR_UNKNOWN';
    this.details = options.details || null;
    this.timestamp = new Date().toISOString();
    this.isOperational = options.isOperational ?? true;
    
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// Error factory functions
export const Errors = {
  network: (message, details = null) => 
    new AppError(message, { 
      category: ERROR_CATEGORIES.NETWORK,
      code: 'ERR_NETWORK',
      details 
    }),
  
  database: (message, details = null) =>
    new AppError(message, {
      category: ERROR_CATEGORIES.DATABASE,
      code: 'ERR_DATABASE',
      severity: ERROR_SEVERITY.HIGH,
      details,
    }),
  
  validation: (message, details = null) =>
    new AppError(message, {
      category: ERROR_CATEGORIES.VALIDATION,
      code: 'ERR_VALIDATION',
      severity: ERROR_SEVERITY.LOW,
      details,
    }),
  
  auth: (message, details = null) =>
    new AppError(message, {
      category: ERROR_CATEGORIES.AUTH,
      code: 'ERR_AUTH',
      severity: ERROR_SEVERITY.MEDIUM,
      details,
    }),
  
  permission: (message, details = null) =>
    new AppError(message, {
      category: ERROR_CATEGORIES.PERMISSION,
      code: 'ERR_PERMISSION',
      severity: ERROR_SEVERITY.MEDIUM,
      details,
    }),
  
  system: (message, details = null) =>
    new AppError(message, {
      category: ERROR_CATEGORIES.SYSTEM,
      code: 'ERR_SYSTEM',
      severity: ERROR_SEVERITY.CRITICAL,
      details,
      isOperational: false,
    }),
};

// Error handler class
class ErrorHandler {
  constructor() {
    this.errorListeners = [];
  }
  
  // Register error listener
  onError(callback) {
    this.errorListeners.push(callback);
    return () => {
      this.errorListeners = this.errorListeners.filter(cb => cb !== callback);
    };
  }
  
  // Notify all listeners
  notifyListeners(error, context) {
    this.errorListeners.forEach(callback => {
      try {
        callback(error, context);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }
  
  // Handle error
  handle(error, context = {}) {
    // Normalize error
    const appError = error instanceof AppError
      ? error
      : new AppError(error.message || String(error), {
          category: ERROR_CATEGORIES.UNKNOWN,
          details: { originalError: error.name, stack: error.stack },
        });
    
    // Log error
    const logMethod = appError.severity === ERROR_SEVERITY.CRITICAL ? 'fatal'
      : appError.severity === ERROR_SEVERITY.HIGH ? 'error'
      : 'warn';
    
    logger[logMethod](`[${appError.code}] ${appError.message}`, {
      category: appError.category,
      severity: appError.severity,
      details: appError.details,
      context,
      stack: appError.stack,
    });
    
    // Notify listeners
    this.notifyListeners(appError, context);
    
    // For non-operational errors, we might want to restart
    if (!appError.isOperational) {
      logger.fatal('Non-operational error detected, application may be in unstable state');
    }
    
    return appError;
  }
  
  // Handle async errors (for promise chains)
  async handleAsync(promise, context = {}) {
    try {
      return await promise;
    } catch (error) {
      throw this.handle(error, context);
    }
  }
  
  // Create error boundary handler for React
  createBoundaryHandler(fallbackUI = null) {
    return {
      onError: (error, errorInfo) => {
        this.handle(error, { componentStack: errorInfo.componentStack });
      },
      fallback: fallbackUI,
    };
  }
}

// Singleton instance
const errorHandler = new ErrorHandler();

// Setup global error handlers
export function setupGlobalErrorHandlers() {
  // Uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught Exception', error);
    errorHandler.handle(error, { type: 'uncaughtException' });
  });
  
  // Unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', { reason, promise });
    errorHandler.handle(reason, { type: 'unhandledRejection' });
  });
  
  // Warning events
  process.on('warning', (warning) => {
    logger.warn('Process Warning', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    });
  });
  
  logger.info('Global error handlers initialized');
}

export default errorHandler;
