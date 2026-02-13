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
  Video,
  Wallet,
  Briefcase,
  Calculator,
  CreditCard,
  Contact,
  Users2,
} from 'lucide-react';

// Main menu items (no group) - with icon colors
const mainMenuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-blue-400' },
  { path: '/my-profile', icon: UserCircle, label: 'My Profile', color: 'text-purple-400' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks', color: 'text-green-400' },
  { path: '/meetings', icon: Video, label: 'Meetings', color: 'text-pink-400' },
  { path: '/leaves', icon: Calendar, label: 'Leaves', color: 'text-orange-400' },
  { path: '/loans', icon: CreditCard, label: 'Loans', color: 'text-emerald-400' },
  { path: '/teams', icon: Users2, label: 'Teams', color: 'text-indigo-400' },
  { path: '/directory', icon: Contact, label: 'Directory', color: 'text-teal-400' },
  { path: '/chat', icon: MessageSquare, label: 'Chat', color: 'text-cyan-400' },
  { path: '/ai-assistant', icon: Bot, label: 'AI Assistant', color: 'text-violet-400' },
  { path: '/documents', icon: FolderOpen, label: 'Documents', color: 'text-amber-400' },
  { path: '/notifications', icon: Bell, label: 'Notifications', color: 'text-red-400' },
  { path: '/settings', icon: Settings, label: 'Settings', color: 'text-gray-400' },
];

// Billing group - Patient intake and insurance verification
const billingMenuItems = [
  { path: '/intake-form', icon: UserPlus, label: 'Intake Form', color: 'text-emerald-400' },
  { path: '/intake-new', icon: ClipboardList, label: 'Intake New', color: 'text-teal-400' },
  { path: '/ar-followup', icon: FileText, label: 'AR Follow Up', color: 'text-lime-400' },
  { path: '/vob-bob', icon: ClipboardList, label: 'VOB / BOB', color: 'text-green-400' },
  { path: '/vob-bob-autofill', icon: FileText, label: 'VOB Auto-Fill', color: 'text-emerald-400' },
];

// HR/Operations group - Time & Attendance
const hrMenuItems = [
  { path: '/attendance', icon: Clock, label: 'Attendance', color: 'text-orange-400' },
  { path: '/time-tracking', icon: Timer, label: 'Time Tracking', color: 'text-yellow-400' },
  { path: '/agreements', icon: FileText, label: 'Agreements', color: 'text-orange-400' },
];

// Accounting group - Financial management (Admin only)
const accountingMenuItems = [
  { path: '/expenses', icon: Receipt, label: 'Expenses', color: 'text-red-400' },
  { path: '/revenue', icon: DollarSign, label: 'Revenue', color: 'text-green-400' },
  { path: '/reports', icon: BarChart3, label: 'Reports', color: 'text-blue-400' },
];

// Admin-only menu items
const adminMenuItems = [
  { path: '/employees', icon: Users, label: 'Employees', color: 'text-indigo-400' },
  { path: '/user-management', icon: UsersRound, label: 'User Accounts', color: 'text-purple-400' },
  { path: '/roles', icon: UserCog, label: 'Role Management', color: 'text-pink-400' },
  { path: '/supervision', icon: MonitorPlay, label: 'Supervision', color: 'text-red-400' },
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
            src="./logo-brand.png" 
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
          {/* Main Menu */}
          {mainMenuItems.map((item) => (
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
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : item.color}`} />
                    {(!collapsed || isMobile) && <span className="text-sm">{item.label}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          
          {/* Billing Group */}
          {(!collapsed || isMobile) && (
            <li className="pt-4 pb-2 px-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" />
                Billing
              </span>
            </li>
          )}
          {collapsed && !isMobile && <li className="border-t border-gray-700 my-2"></li>}
          {billingMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  } ${collapsed && !isMobile ? 'justify-center' : ''}`
                }
                title={collapsed && !isMobile ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : item.color}`} />
                    {(!collapsed || isMobile) && <span className="text-sm">{item.label}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          
          {/* HR/Operations Group */}
          {(!collapsed || isMobile) && (
            <li className="pt-4 pb-2 px-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                HR / Operations
              </span>
            </li>
          )}
          {collapsed && !isMobile && <li className="border-t border-gray-700 my-2"></li>}
          {hrMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  } ${collapsed && !isMobile ? 'justify-center' : ''}`
                }
                title={collapsed && !isMobile ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : item.color}`} />
                    {(!collapsed || isMobile) && <span className="text-sm">{item.label}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          
          {/* Accounting Group - Admin Only */}
          {user && (user.role === 'admin' || user.role === 'super_admin') && (
            <>
              {(!collapsed || isMobile) && (
                <li className="pt-4 pb-2 px-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Calculator className="w-3.5 h-3.5" />
                    Accounting
                  </span>
                </li>
              )}
              {collapsed && !isMobile && <li className="border-t border-gray-700 my-2"></li>}
              {accountingMenuItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-yellow-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      } ${collapsed && !isMobile ? 'justify-center' : ''}`
                    }
                    title={collapsed && !isMobile ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : item.color}`} />
                        {(!collapsed || isMobile) && <span className="text-sm">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </>
          )}
          
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
                    {({ isActive }) => (
                      <>
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : item.color}`} />
                        {(!collapsed || isMobile) && <span className="text-sm">{item.label}</span>}
                      </>
                    )}
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
        
        {/* Version Display */}
        {(!collapsed || isMobile) && (
          <div className="mt-3 text-center text-xs text-gray-500">
            Guardian ERP v2.6.5
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
