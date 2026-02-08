/**
 * Guardian Desktop ERP - Auth Service
 * JWT token management for client-side
 */

const TOKEN_KEY = 'guardian_auth_token';
const USER_KEY = 'guardian_user';

/**
 * Store authentication token
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Get stored token
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Remove stored token
 */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  
  try {
    // Decode JWT and check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    
    return payload.exp > now;
  } catch {
    return false;
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiry() {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}

/**
 * Get user data from token
 */
export function getUserFromToken() {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Store user data
 */
export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get stored user data
 */
export function getUser() {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export default {
  setToken,
  getToken,
  clearToken,
  isAuthenticated,
  getTokenExpiry,
  getUserFromToken,
  setUser,
  getUser,
};
