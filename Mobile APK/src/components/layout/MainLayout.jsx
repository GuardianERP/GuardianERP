/**
 * Guardian ERP Mobile - Main Layout
 * Mobile-first responsive design with bottom navigation
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import VoiceControl from '../VoiceControl';
import UpdateNotification from '../UpdateNotification';
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  MessageSquare,
  Menu,
} from 'lucide-react';

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Bottom navigation items for mobile
  const bottomNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { path: '/attendance', icon: Clock, label: 'Attendance' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
  ];

  const isActiveRoute = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: fixed, Mobile: overlay */}
      <Sidebar 
        collapsed={!isMobile && !sidebarOpen} 
        onToggle={toggleSidebar}
        isMobile={isMobile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      {/* Main Content */}
      <div 
        className={`transition-all duration-300 ${
          isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-20')
        }`}
      >
        {/* Header */}
        <Header 
          onToggleSidebar={toggleSidebar} 
          sidebarCollapsed={!sidebarOpen}
          isMobile={isMobile}
        />
        
        {/* Page Content - Add bottom padding for mobile nav */}
        <main className={`p-3 sm:p-4 md:p-6 min-h-[calc(100vh-4rem)] ${isMobile ? 'pb-20' : ''}`}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30 safe-area-bottom">
          <div className="flex items-center justify-around h-16">
            {bottomNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                  isActiveRoute(item.path)
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActiveRoute(item.path) ? 'scale-110' : ''}`} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            ))}
            <button
              onClick={toggleSidebar}
              className="flex flex-col items-center justify-center w-full h-full text-gray-500 dark:text-gray-400"
            >
              <Menu className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">More</span>
            </button>
          </div>
        </nav>
      )}
      
      {/* Voice Control Floating Button - Hidden on mobile or positioned higher */}
      {!isMobile && <VoiceControl />}
      
      {/* Update Notification */}
      <UpdateNotification />
    </div>
  );
}

export default MainLayout;
