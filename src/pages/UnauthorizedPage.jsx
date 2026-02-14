/**
 * Guardian Desktop ERP - Unauthorized Page
 * Professional access denied page with department-specific messages and recommendations
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ShieldX, ArrowLeft, Home, HelpCircle, Mail, Building2,
  Users, FileText, DollarSign, Briefcase, ClipboardList, UserCog
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { usePermission, PERMISSIONS } from '../hooks/usePermission';

// Reason-specific content configurations
const REASON_CONTENT = {
  billing: {
    title: 'Billing Access Required',
    icon: ClipboardList,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    message: 'This page is restricted to the Operations/Billing department and administrators.',
    recommendations: [
      'Contact your supervisor to request billing access',
      'If you need to submit a patient intake, please reach out to the billing team',
      'For VOB/BOB inquiries, contact the operations department'
    ],
    department: 'Operations/Billing'
  },
  hr: {
    title: 'HR Access Required',
    icon: Users,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    message: 'This page is restricted to the Human Resources department and administrators.',
    recommendations: [
      'Contact HR for any agreement-related questions',
      'Your agreements will be shared with you via email or chat',
      'For policy questions, reach out to your HR representative'
    ],
    department: 'Human Resources'
  },
  accounting: {
    title: 'Accounting Access Required',
    icon: DollarSign,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    message: 'This page is restricted to administrators only for financial security.',
    recommendations: [
      'Submit expense reports through the Expenses page (if available)',
      'For financial inquiries, contact the accounting department',
      'Revenue reports can be requested from your manager'
    ],
    department: 'Accounting'
  },
  admin: {
    title: 'Administrator Access Required',
    icon: UserCog,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    message: 'This page is restricted to system administrators only.',
    recommendations: [
      'If you need administrative access, contact your supervisor',
      'For user account issues, speak with your HR or IT department',
      'Role changes must be approved by management'
    ],
    department: 'Administration'
  },
  default: {
    title: 'Access Denied',
    icon: ShieldX,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    message: 'You don\'t have permission to access this page.',
    recommendations: [
      'Contact your administrator if you believe this is an error',
      'Check if you\'re logged in with the correct account',
      'Some features may require specific department membership'
    ],
    department: null
  }
};

function UnauthorizedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { roleInfo, hasPermission } = usePermission();
  
  // Get reason from URL params
  const reason = searchParams.get('reason') || 'default';
  const content = REASON_CONTENT[reason] || REASON_CONTENT.default;
  const IconComponent = content.icon;
  
  // List of pages user CAN access
  const accessiblePages = [
    { path: '/dashboard', name: 'Dashboard', permission: null, icon: Home },
    { path: '/my-profile', name: 'My Profile', permission: null, icon: Users },
    { path: '/tasks', name: 'Tasks', permission: PERMISSIONS.TASKS_READ, icon: FileText },
    { path: '/chat', name: 'Chat', permission: PERMISSIONS.CHAT_READ, icon: Mail },
    { path: '/teams', name: 'Teams', permission: null, icon: Users },
    { path: '/directory', name: 'Directory', permission: null, icon: Building2 },
  ].filter(page => !page.permission || hasPermission(page.permission));

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className={`px-8 py-6 ${content.iconBg.replace('dark:', '').replace('/30', '/10')} border-b border-gray-100 dark:border-slate-700`}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 ${content.iconBg} rounded-2xl flex items-center justify-center`}>
                <IconComponent className={`w-8 h-8 ${content.iconColor}`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {content.title}
                </h1>
                {content.department && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <Building2 className="w-4 h-4" />
                    {content.department} Department Access
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-8">
            {/* Message */}
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {content.message}
            </p>
            
            {/* User Info Card */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user?.email || 'Unknown User'}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-slate-600 rounded-full text-xs">
                      {roleInfo?.name || user?.role || 'Employee'}
                    </span>
                    {user?.department && (
                      <span className="text-xs">
                        • {user.department} Department
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recommendations */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                What you can do:
              </h3>
              <ul className="space-y-2">
                {content.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
              
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
        
        {/* Quick Access Card */}
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Pages you can access:
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {accessiblePages.map(page => {
              const PageIcon = page.icon;
              return (
                <button
                  key={page.path}
                  onClick={() => navigate(page.path)}
                  className="flex flex-col items-center gap-1 p-3 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-xl transition-colors"
                >
                  <PageIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{page.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Contact Support */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need access? Contact your supervisor or{' '}
            <button
              onClick={() => navigate('/chat')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              message HR
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
