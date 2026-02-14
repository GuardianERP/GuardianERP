/**
 * Guardian Desktop ERP - Header Component
 * Top navigation bar with search, notifications, and user menu
 * Mobile-responsive design
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Briefcase,
} from 'lucide-react';
import { getPositionLabel, getDepartmentLabel, getDepartmentColor } from '../../data/organizationConfig';

const pageNames = {
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/attendance': 'Attendance',
  '/tasks': 'Tasks',
  '/leaves': 'Leave Management',
  '/loans': 'Loan Requests',
  '/teams': 'Teams',
  '/directory': 'Employee Directory',
  '/expenses': 'Expenses',
  '/revenue': 'Revenue',
  '/reports': 'Reports',
  '/chat': 'Chat',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/documents': 'Documents',
  '/time-tracking': 'Time Tracking',
  '/meetings': 'Meetings',
  '/agreements': 'Agreements',
  '/my-profile': 'My Profile',
  '/ai-assistant': 'AI Assistant',
};

function Header({ onToggleSidebar, sidebarCollapsed, isMobile }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef(null);

  const currentPage = pageNames[location.pathname] || 'Dashboard';

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement global search
      console.log('Search:', searchQuery);
    }
  };

  return (
    <header className="h-14 sm:h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30">
      {/* Left Section */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Menu Toggle - always visible on mobile */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Page Title */}
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
            {currentPage}
          </h1>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Center Section - Search (hidden on mobile) */}
      <form onSubmit={handleSearch} className="hidden lg:block flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees, tasks, documents..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </form>

      {/* Right Section */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
          ) : (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          )}
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
          {/* Notification badge */}
          <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-purple-200 dark:ring-purple-800" />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-[10px] sm:text-xs font-semibold text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
            )}
            <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300 transition-transform hidden sm:block ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 sm:w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-scale-in">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                {user?.designation && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Briefcase className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      {getPositionLabel(user.designation)}
                    </p>
                  </div>
                )}
                {user?.department && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3 h-3 text-gray-400" />
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getDepartmentColor(user.department)}`}>
                      {getDepartmentLabel(user.department)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                  {user?.email}
                </p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/settings');
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/settings');
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>

              {/* Logout */}
              <div className="py-1 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
