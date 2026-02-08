/**
 * Guardian Desktop ERP - usePresence Hook
 * React hook to track online presence of employees
 * Automatically detects who has the app open
 */

import { useState, useEffect } from 'react';
import { presenceService } from '../services/presenceService';
import { useAuth } from '../store/AuthContext';

/**
 * Hook to initialize presence tracking for the current user
 * Call this once in App or MainLayout
 */
export function usePresenceInit() {
  const { user, isLoggedIn } = useAuth();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isLoggedIn && user?.employeeId && !initialized) {
      presenceService.init(user).then(() => {
        setInitialized(true);
      });
    }

    return () => {
      if (initialized) {
        presenceService.cleanup();
        setInitialized(false);
      }
    };
  }, [isLoggedIn, user?.employeeId]);

  return initialized;
}

/**
 * Hook to get list of online employees
 * Updates automatically when presence changes
 */
export function useOnlineEmployees() {
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    // Get initial state
    setOnlineUsers(presenceService.getOnlineUsers());

    // Subscribe to changes
    const unsubscribe = presenceService.onPresenceChange((users) => {
      setOnlineUsers(users);
    });

    return unsubscribe;
  }, []);

  return onlineUsers;
}

/**
 * Hook to check if a specific employee is online
 */
export function useIsOnline(employeeId) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Get initial state
    setIsOnline(presenceService.isOnline(employeeId));

    // Subscribe to changes
    const unsubscribe = presenceService.onPresenceChange(() => {
      setIsOnline(presenceService.isOnline(employeeId));
    });

    return unsubscribe;
  }, [employeeId]);

  return isOnline;
}

export default useOnlineEmployees;
