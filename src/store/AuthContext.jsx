/**
 * Guardian Desktop ERP - Auth Context
 * Manages authentication state and user session
 * Supports auto-login with secure credential storage
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
  const [rememberMe, setRememberMe] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = getToken();
      
      // If we have a valid token, try to use it
      if (token && isAuthenticated()) {
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
          setLoading(false);
          return;
        }
      }

      // No valid token, check if we should auto-login with stored credentials
      if (window.electronAPI?.credentials?.get && window.electronAPI?.app?.isAutoStart) {
        const autoStartResult = await window.electronAPI.app.isAutoStart();
        const credentialsResult = await window.electronAPI.credentials.get();
        
        if (credentialsResult.success && credentialsResult.data) {
          const { email, password } = credentialsResult.data;
          
          // Auto-login with stored credentials
          console.log('Auto-login with stored credentials...');
          const loginResult = await authAPI.login(email, password);
          
          if (loginResult.success) {
            setToken(loginResult.data.token);
            storeUser(loginResult.data.user);
            setUser(loginResult.data.user);
            setIsLoggedIn(true);
            
            if (autoStartResult.isAutoStart) {
              toast.success('Auto-login successful!');
            }
          } else {
            // Clear invalid credentials
            await window.electronAPI.credentials.clear();
            clearToken();
          }
        } else {
          clearToken();
        }
      } else {
        clearToken();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email, password, remember = false) => {
    try {
      const result = await authAPI.login(email, password);
      
      if (result.success) {
        setToken(result.data.token);
        storeUser(result.data.user);
        setUser(result.data.user);
        setIsLoggedIn(true);
        
        // Store credentials securely if "Remember Me" is enabled
        if (remember && window.electronAPI?.credentials?.store) {
          await window.electronAPI.credentials.store(email, password);
          console.log('Credentials stored for auto-login');
        }
        
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

  const logout = useCallback(async () => {
    // Clear stored credentials on logout
    if (window.electronAPI?.credentials?.clear) {
      await window.electronAPI.credentials.clear();
    }
    
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
    rememberMe,
    setRememberMe,
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
