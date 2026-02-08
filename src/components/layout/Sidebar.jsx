/**
 * Guardian Desktop ERP - Sidebar Navigation
 * Main navigation menu with role-based access control
 * Mobile-responsive drawer mode
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import {
  LayoutDashboard,
  Users,
  Clock,
  CheckSquare,
  Calendar,
  Receipt,
  DollarSign,
  BarChart3,
  MessageSquare,
  Bell,
  Settings,
  FolderOpen,
  Timer,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Bot,
  FileText,
  ClipboardList,
  UserCircle,
  UsersRound,
  MonitorPlay,
  X,
  UserPlus,
} from 'lucide-react';

// Menu items visible to all employees
const employeeMenuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/my-profile', icon: UserCircle, label: 'My Profile' },
  { path: '/attendance', icon: Clock, label: 'Attendance' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/leaves', icon: Calendar, label: 'Leaves' },
  { path: '/intake-form', icon: UserPlus, label: 'Intake Form' },
  { path: '/ar-followup', icon: FileText, label: 'AR Follow Up' },
  { path: '/vob-bob', icon: ClipboardList, label: 'VOB / BOB' },
  { path: '/vob-bob-autofill', icon: FileText, label: 'VOB Auto-Fill' },
  { path: '/manual-vob', icon: FileText, label: 'Manual VOB' },
  { path: '/time-tracking', icon: Timer, label: 'Time Tracking' },
  { path: '/documents', icon: FolderOpen, label: 'Documents' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
  { path: '/notifications', icon: Bell, label: 'Notifications' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

// Admin-only menu items (expenses, revenue, reports, employees, user management)
const adminMenuItems = [
  { path: '/employees', icon: Users, label: 'Employees' },
  { path: '/expenses', icon: Receipt, label: 'Expenses' },
  { path: '/revenue', icon: DollarSign, label: 'Revenue' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/user-management', icon: UsersRound, label: 'User Accounts' },
  { path: '/roles', icon: UserCog, label: 'Role Management' },
  { path: '/supervision', icon: MonitorPlay, label: 'Supervision' },
];

function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, isMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleNavClick = () => {
    // Close mobile menu when navigating
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  // Mobile: show as drawer when mobileOpen is true
  // Desktop: show normally with collapsed state
  const sidebarClasses = isMobile
    ? `fixed left-0 top-0 h-screen bg-gray-900 text-white z-50 flex flex-col w-72 transform transition-transform duration-300 ease-in-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : `fixed left-0 top-0 h-screen bg-gray-900 text-white z-40 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`;

  return (
    <aside className={sidebarClasses}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <img 
            src="/logo-brand.png" 
            alt="Guardian ERP" 
            className="h-10 flex-shrink-0"
          />
          {(!collapsed || isMobile) && (
            <span className="font-bold text-lg">Guardian ERP</span>
          )}
        </div>
        {isMobile ? (
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* User Info */}
      {(!collapsed || isMobile) && user && (
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {employeeMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  } ${collapsed && !isMobile ? 'justify-center' : ''}`
                }
                title={collapsed && !isMobile ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {(!collapsed || isMobile) && <span className="text-sm">{item.label}</span>}
              </NavLink>
            </li>
          ))}
          
          {/* Admin-only menu items */}
          {user && (user.role === 'admin' || user.role === 'super_admin') && (
            <>
              {(!collapsed || isMobile) && (
                <li className="pt-4 pb-2 px-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </span>
                </li>
              )}
              {adminMenuItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      } ${collapsed && !isMobile ? 'justify-center' : ''}`
                    }
                    title={collapsed && !isMobile ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {(!collapsed || isMobile) && <span className="text-sm">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-colors ${
            collapsed && !isMobile ? 'justify-center' : ''
          }`}
          title={collapsed && !isMobile ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
