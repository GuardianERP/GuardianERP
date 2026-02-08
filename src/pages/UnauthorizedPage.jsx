/**
 * Guardian Desktop ERP - Unauthorized Page
 * Shows when user lacks permission to access a page
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home, HelpCircle } from 'lucide-react';
import { usePermission, PERMISSIONS } from '../hooks/usePermission';

function UnauthorizedPage() {
  const navigate = useNavigate();
  const { roleInfo, hasPermission } = usePermission();
  
  // List of pages user CAN access
  const accessiblePages = [
    { path: '/dashboard', name: 'Dashboard', permission: null },
    { path: '/employees', name: 'Employees', permission: PERMISSIONS.EMPLOYEES_READ },
    { path: '/attendance', name: 'Attendance', permission: PERMISSIONS.TIME_READ },
    { path: '/tasks', name: 'Tasks', permission: PERMISSIONS.TASKS_READ },
    { path: '/leaves', name: 'Leaves', permission: PERMISSIONS.LEAVES_READ },
    { path: '/expenses', name: 'Expenses', permission: PERMISSIONS.EXPENSES_READ },
    { path: '/revenue', name: 'Revenue', permission: PERMISSIONS.REVENUE_READ },
    { path: '/reports', name: 'Reports', permission: PERMISSIONS.REPORTS_READ },
    { path: '/chat', name: 'Chat', permission: PERMISSIONS.CHAT_READ },
    { path: '/settings', name: 'Settings', permission: PERMISSIONS.SETTINGS_READ },
  ].filter(page => !page.permission || hasPermission(page.permission));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Error Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-10 h-10 text-red-500" />
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>
          
          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          
          {/* Role Info */}
          {roleInfo && (
            <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your current role:
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {roleInfo.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {roleInfo.description}
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </button>
          </div>
        </div>
        
        {/* Accessible Pages */}
        {accessiblePages.length > 0 && (
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Pages you can access:
            </h3>
            <div className="flex flex-wrap gap-2">
              {accessiblePages.map(page => (
                <button
                  key={page.path}
                  onClick={() => navigate(page.path)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {page.name}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Help Link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <HelpCircle className="w-4 h-4" />
            Need help? Contact support
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
