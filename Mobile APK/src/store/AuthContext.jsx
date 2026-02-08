/**
 * Guardian Desktop ERP - Auth Context
 * Manages authentication state and user session
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setToken, getToken, clearToken, isAuthenticated, setUser as storeUser, getUser as getStoredUser } from '../services/auth';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = getToken();
      
      if (!token || !isAuthenticated()) {
        setLoading(false);
        return;
      }

      // Try to get stored user first
      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        setIsLoggedIn(true);
        setLoading(false);
        return;
      }

      // Verify token with backend
      const result = await authAPI.verify(token);
      
      if (result.success) {
        setUser(result.data.user);
        storeUser(result.data.user);
        setIsLoggedIn(true);
      } else {
        clearToken();
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email, password) => {
    try {
      const result = await authAPI.login(email, password);
      
      if (result.success) {
        setToken(result.data.token);
        storeUser(result.data.user);
        setUser(result.data.user);
        setIsLoggedIn(true);
        toast.success('Welcome back!');
        return { success: true };
      } else {
        toast.error(result.error || 'Login failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      toast.error('Connection error');
      return { success: false, error: error.message };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const result = await authAPI.register(userData);
      
      if (result.success) {
        toast.success('Registration successful! Please login.');
        return { success: true };
      } else {
        toast.error(result.error || 'Registration failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      toast.error('Connection error');
      return { success: false, error: error.message };
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setIsLoggedIn(false);
    toast.success('Logged out successfully');
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      storeUser(updated); // Also update localStorage
      return updated;
    });
  }, []);

  const value = {
    user,
    loading,
    isLoggedIn,
    login,
    register,
    logout,
    updateUser,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
export default AuthContext;
