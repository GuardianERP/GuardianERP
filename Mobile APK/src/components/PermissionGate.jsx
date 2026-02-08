/**
 * Guardian Desktop ERP - Permission Gate Component
 * HOC for protecting components based on permissions
 */

import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { Lock } from 'lucide-react';

/**
 * PermissionGate - Wrapper component that shows children only if user has permission
 * @param {string} permission - Required permission (e.g., 'employees:create')
 * @param {string[]} permissions - Array of permissions (user needs at least one)
 * @param {boolean} requireAll - If true, user needs all permissions
 * @param {React.ReactNode} children - Content to show if permitted
 * @param {React.ReactNode} fallback - Content to show if not permitted
 * @param {boolean} showLocked - Show locked indicator instead of hiding
 */
export function PermissionGate({ 
  permission, 
  permissions = [], 
  requireAll = false,
  children, 
  fallback = null,
  showLocked = false,
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();
  
  let hasAccess = false;
  
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else {
    hasAccess = true; // No permission required
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (showLocked) {
    return (
      <div className="inline-flex items-center gap-1 text-gray-400 cursor-not-allowed" title="You don't have permission">
        <Lock className="w-4 h-4" />
        <span className="text-sm">Locked</span>
      </div>
    );
  }
  
  return fallback;
}

/**
 * FeatureGate - Wrapper for entire features/pages
 */
export function FeatureGate({ 
  permission, 
  permissions = [],
  requireAll = false,
  children,
  fallback,
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, roleInfo } = usePermission();
  
  let hasAccess = false;
  
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else {
    hasAccess = true;
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // Default fallback for feature gates
  if (fallback) {
    return fallback;
  }
  
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Access Restricted
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          You don't have permission to access this feature.
        </p>
        {roleInfo && (
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Your role: <span className="font-medium">{roleInfo.name}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * AdminOnly - Shortcut for admin-only content
 */
export function AdminOnly({ children, fallback = null }) {
  const { isAdmin } = usePermission();
  
  if (isAdmin) {
    return <>{children}</>;
  }
  
  return fallback;
}

/**
 * ManagerOnly - Shortcut for manager+ only content
 */
export function ManagerOnly({ children, fallback = null }) {
  const { isManager } = usePermission();
  
  if (isManager) {
    return <>{children}</>;
  }
  
  return fallback;
}

/**
 * withPermission - HOC for class components
 */
export function withPermission(WrappedComponent, requiredPermission) {
  return function PermissionWrapper(props) {
    return (
      <PermissionGate permission={requiredPermission}>
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}

export default PermissionGate;
