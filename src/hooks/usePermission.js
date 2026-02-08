/**
 * Guardian Desktop ERP - Permission Hook
 * Custom hook for checking user permissions
 */

import { useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '../store/AuthContext';

// Permission definitions
export const PERMISSIONS = {
  // Employee permissions
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_READ: 'employees:read',
  EMPLOYEES_UPDATE: 'employees:update',
  EMPLOYEES_DELETE: 'employees:delete',
  
  // Task permissions
  TASKS_CREATE: 'tasks:create',
  TASKS_READ: 'tasks:read',
  TASKS_UPDATE: 'tasks:update',
  TASKS_DELETE: 'tasks:delete',
  TASKS_ASSIGN: 'tasks:assign',
  
  // Leave permissions
  LEAVES_CREATE: 'leaves:create',
  LEAVES_READ: 'leaves:read',
  LEAVES_UPDATE: 'leaves:update',
  LEAVES_DELETE: 'leaves:delete',
  LEAVES_APPROVE: 'leaves:approve',
  
  // Expense permissions
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_READ: 'expenses:read',
  EXPENSES_UPDATE: 'expenses:update',
  EXPENSES_DELETE: 'expenses:delete',
  EXPENSES_APPROVE: 'expenses:approve',
  
  // Revenue permissions
  REVENUE_CREATE: 'revenue:create',
  REVENUE_READ: 'revenue:read',
  REVENUE_UPDATE: 'revenue:update',
  REVENUE_DELETE: 'revenue:delete',
  
  // Report permissions
  REPORTS_READ: 'reports:read',
  REPORTS_GENERATE: 'reports:generate',
  REPORTS_EXPORT: 'reports:export',
  
  // Time tracking permissions
  TIME_CREATE: 'time:create',
  TIME_READ: 'time:read',
  TIME_UPDATE: 'time:update',
  TIME_DELETE: 'time:delete',
  
  // Chat permissions
  CHAT_READ: 'chat:read',
  CHAT_SEND: 'chat:send',
  CHAT_DELETE: 'chat:delete',
  
  // File permissions
  FILES_UPLOAD: 'files:upload',
  FILES_READ: 'files:read',
  FILES_DELETE: 'files:delete',
  
  // Settings permissions
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  
  // Admin permissions
  ADMIN_USERS: 'admin:users',
  ADMIN_ROLES: 'admin:roles',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_LOGS: 'admin:logs',
};

// Role definitions with their permissions
export const ROLES = {
  super_admin: {
    name: 'Super Admin',
    description: 'Full access to everything',
    permissions: Object.values(PERMISSIONS),
  },
  admin: {
    name: 'Admin',
    description: 'Administrative access',
    permissions: [
      PERMISSIONS.EMPLOYEES_CREATE, PERMISSIONS.EMPLOYEES_READ, PERMISSIONS.EMPLOYEES_UPDATE, PERMISSIONS.EMPLOYEES_DELETE,
      PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_UPDATE, PERMISSIONS.TASKS_DELETE, PERMISSIONS.TASKS_ASSIGN,
      PERMISSIONS.LEAVES_CREATE, PERMISSIONS.LEAVES_READ, PERMISSIONS.LEAVES_UPDATE, PERMISSIONS.LEAVES_APPROVE,
      PERMISSIONS.EXPENSES_CREATE, PERMISSIONS.EXPENSES_READ, PERMISSIONS.EXPENSES_UPDATE, PERMISSIONS.EXPENSES_APPROVE,
      PERMISSIONS.REVENUE_CREATE, PERMISSIONS.REVENUE_READ, PERMISSIONS.REVENUE_UPDATE,
      PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_GENERATE, PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.TIME_CREATE, PERMISSIONS.TIME_READ, PERMISSIONS.TIME_UPDATE,
      PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_SEND,
      PERMISSIONS.FILES_UPLOAD, PERMISSIONS.FILES_READ, PERMISSIONS.FILES_DELETE,
      PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_UPDATE,
      PERMISSIONS.ADMIN_USERS, PERMISSIONS.ADMIN_ROLES, PERMISSIONS.ADMIN_SETTINGS,
    ],
  },
  manager: {
    name: 'Manager',
    description: 'Manage team, approve requests, view team data',
    permissions: [
      PERMISSIONS.EMPLOYEES_READ, PERMISSIONS.EMPLOYEES_UPDATE,
      PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_UPDATE, PERMISSIONS.TASKS_DELETE, PERMISSIONS.TASKS_ASSIGN,
      PERMISSIONS.LEAVES_READ, PERMISSIONS.LEAVES_APPROVE,
      PERMISSIONS.EXPENSES_READ, PERMISSIONS.EXPENSES_APPROVE,
      PERMISSIONS.REVENUE_READ,
      PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_GENERATE,
      PERMISSIONS.TIME_CREATE, PERMISSIONS.TIME_READ, PERMISSIONS.TIME_UPDATE,
      PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_SEND,
      PERMISSIONS.FILES_UPLOAD, PERMISSIONS.FILES_READ,
      PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_UPDATE,
    ],
  },
  hr: {
    name: 'HR',
    description: 'Employee management, leave approvals, reports',
    permissions: [
      PERMISSIONS.EMPLOYEES_CREATE, PERMISSIONS.EMPLOYEES_READ, PERMISSIONS.EMPLOYEES_UPDATE, PERMISSIONS.EMPLOYEES_DELETE,
      PERMISSIONS.TASKS_READ,
      PERMISSIONS.LEAVES_CREATE, PERMISSIONS.LEAVES_READ, PERMISSIONS.LEAVES_UPDATE, PERMISSIONS.LEAVES_APPROVE,
      PERMISSIONS.EXPENSES_READ,
      PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_GENERATE,
      PERMISSIONS.TIME_READ,
      PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_SEND,
      PERMISSIONS.FILES_UPLOAD, PERMISSIONS.FILES_READ,
      PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_UPDATE,
    ],
  },
  finance: {
    name: 'Finance',
    description: 'Revenue, expense approvals, financial reports',
    permissions: [
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.EXPENSES_CREATE, PERMISSIONS.EXPENSES_READ, PERMISSIONS.EXPENSES_UPDATE, PERMISSIONS.EXPENSES_APPROVE,
      PERMISSIONS.REVENUE_CREATE, PERMISSIONS.REVENUE_READ, PERMISSIONS.REVENUE_UPDATE, PERMISSIONS.REVENUE_DELETE,
      PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_GENERATE, PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_SEND,
      PERMISSIONS.FILES_UPLOAD, PERMISSIONS.FILES_READ,
      PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_UPDATE,
    ],
  },
  employee: {
    name: 'Employee',
    description: 'Own data only, submit requests',
    permissions: [
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_UPDATE,
      PERMISSIONS.LEAVES_CREATE, PERMISSIONS.LEAVES_READ,
      PERMISSIONS.EXPENSES_CREATE, PERMISSIONS.EXPENSES_READ,
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.TIME_CREATE, PERMISSIONS.TIME_READ, PERMISSIONS.TIME_UPDATE,
      PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_SEND,
      PERMISSIONS.FILES_UPLOAD, PERMISSIONS.FILES_READ,
      PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_UPDATE,
    ],
  },
  guest: {
    name: 'Guest',
    description: 'Read-only access to limited data',
    permissions: [
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.TASKS_READ,
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.CHAT_READ,
      PERMISSIONS.FILES_READ,
      PERMISSIONS.SETTINGS_READ,
    ],
  },
};

/**
 * Custom hook for permission checking
 */
export function usePermission() {
  const { user } = useContext(AuthContext);
  
  // Get user's role permissions
  const userPermissions = useMemo(() => {
    if (!user) return [];
    const role = user.role || 'employee';
    const roleConfig = ROLES[role] || ROLES.employee;
    return roleConfig.permissions || [];
  }, [user]);
  
  // Check if user has a specific permission
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    return userPermissions.includes(permission);
  }, [user, userPermissions]);
  
  // Check if user has any of the given permissions
  const hasAnyPermission = useCallback((permissions) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    return permissions.some(p => userPermissions.includes(p));
  }, [user, userPermissions]);
  
  // Check if user has all of the given permissions
  const hasAllPermissions = useCallback((permissions) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    return permissions.every(p => userPermissions.includes(p));
  }, [user, userPermissions]);
  
  // Check if user can access a resource
  const canAccess = useCallback((resource) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    return userPermissions.some(p => p.startsWith(`${resource}:`));
  }, [user, userPermissions]);
  
  // Check if user can perform action on resource
  const canAction = useCallback((resource, action) => {
    const permission = `${resource}:${action}`;
    return hasPermission(permission);
  }, [hasPermission]);
  
  // Check if user is admin
  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.role === 'super_admin' || user.role === 'admin';
  }, [user]);
  
  // Check if user is manager or above
  const isManager = useMemo(() => {
    if (!user) return false;
    return ['super_admin', 'admin', 'manager'].includes(user.role);
  }, [user]);
  
  // Get user's role info
  const roleInfo = useMemo(() => {
    if (!user) return null;
    const role = user.role || 'employee';
    return ROLES[role] || ROLES.employee;
  }, [user]);
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    canAction,
    isAdmin,
    isManager,
    roleInfo,
    userPermissions,
    user,
  };
}

export default usePermission;
