/**
 * Guardian Desktop ERP - Logging Service
 * Centralized logging with multiple levels and file output
 */

import { app } from 'electron';
import fs from 'fs';
import path from 'path';

// Log levels
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

// Current log level (can be configured)
let currentLogLevel = LOG_LEVELS.INFO;

// Log file settings
const LOG_DIR = app ? path.join(app.getPath('userData'), 'logs') : './logs';
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

// Ensure log directory exists
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Get current log file path
function getLogFilePath() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `guardian-erp-${date}.log`);
}

// Rotate logs if needed
function rotateLogsIfNeeded() {
  const logFile = getLogFilePath();
  
  try {
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      if (stats.size >= MAX_LOG_SIZE) {
        // Rotate existing logs
        for (let i = MAX_LOG_FILES - 1; i >= 0; i--) {
          const oldFile = i === 0 ? logFile : `${logFile}.${i}`;
          const newFile = `${logFile}.${i + 1}`;
          
          if (fs.existsSync(oldFile)) {
            if (i === MAX_LOG_FILES - 1) {
              fs.unlinkSync(oldFile);
            } else {
              fs.renameSync(oldFile, newFile);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error rotating logs:', error);
  }
}

// Format log entry
function formatLogEntry(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const levelName = Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === level);
  
  let entry = `[${timestamp}] [${levelName}] ${message}`;
  
  if (data) {
    if (data instanceof Error) {
      entry += `\n  Error: ${data.message}`;
      if (data.stack) {
        entry += `\n  Stack: ${data.stack}`;
      }
    } else if (typeof data === 'object') {
      entry += `\n  Data: ${JSON.stringify(data, null, 2)}`;
    } else {
      entry += `\n  Data: ${data}`;
    }
  }
  
  return entry;
}

// Write to log file
function writeToFile(entry) {
  try {
    ensureLogDir();
    rotateLogsIfNeeded();
    
    const logFile = getLogFilePath();
    fs.appendFileSync(logFile, entry + '\n', 'utf8');
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

// Main log function
function log(level, message, data = null) {
  if (level < currentLogLevel) return;
  
  const entry = formatLogEntry(level, message, data);
  
  // Console output with colors
  switch (level) {
    case LOG_LEVELS.DEBUG:
      console.debug('\x1b[90m%s\x1b[0m', entry);
      break;
    case LOG_LEVELS.INFO:
      console.info('\x1b[36m%s\x1b[0m', entry);
      break;
    case LOG_LEVELS.WARN:
      console.warn('\x1b[33m%s\x1b[0m', entry);
      break;
    case LOG_LEVELS.ERROR:
    case LOG_LEVELS.FATAL:
      console.error('\x1b[31m%s\x1b[0m', entry);
      break;
    default:
      console.log(entry);
  }
  
  // Write to file
  writeToFile(entry);
}

// Logger instance
const logger = {
  debug: (message, data) => log(LOG_LEVELS.DEBUG, message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, message, data),
  warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
  error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
  fatal: (message, data) => log(LOG_LEVELS.FATAL, message, data),
  
  setLevel: (level) => {
    if (typeof level === 'string') {
      currentLogLevel = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
    } else {
      currentLogLevel = level;
    }
  },
  
  getLevel: () => currentLogLevel,
  
  getLogDir: () => LOG_DIR,
  
  // Read recent logs
  getRecentLogs: (lines = 100) => {
    try {
      const logFile = getLogFilePath();
      if (!fs.existsSync(logFile)) return [];
      
      const content = fs.readFileSync(logFile, 'utf8');
      const allLines = content.split('\n').filter(l => l.trim());
      return allLines.slice(-lines);
    } catch (error) {
      console.error('Error reading logs:', error);
      return [];
    }
  },
  
  // Clear all logs
  clearLogs: () => {
    try {
      const files = fs.readdirSync(LOG_DIR);
      files.forEach(file => {
        if (file.startsWith('guardian-erp-') && file.endsWith('.log')) {
          fs.unlinkSync(path.join(LOG_DIR, file));
        }
      });
      return true;
    } catch (error) {
      console.error('Error clearing logs:', error);
      return false;
    }
  },
};

export default logger;
