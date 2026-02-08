/**
 * Guardian Desktop ERP - Authentication Utilities
 * Password hashing and JWT token management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Secret key for JWT (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'guardian-desktop-erp-secret-key-2024';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 * @param {Object} payload - Token payload (user data)
 * @returns {string} - JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded payload
 * @throws {Error} - If token is invalid
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Extract token from authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Token or null
 */
function extractToken(authHeader) {
  if (!authHeader) return null;
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
function isTokenExpired(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  extractToken,
  isTokenExpired,
  JWT_SECRET,
};
