/**
 * Guardian Desktop ERP - Main Layout
 * Sidebar + Header + Content area with mobile responsiveness
 */

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import VoiceControl from '../VoiceControl';
import UpdateNotification from '../UpdateNotification';

function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onMobileClose={closeMobileMenu}
        isMobile={isMobile}
      />
      
      {/* Main Content */}
      <div 
        className={`transition-all duration-300 ${
          isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-20' : 'ml-64')
        }`}
      >
        {/* Header */}
        <Header 
          onToggleSidebar={toggleSidebar} 
          sidebarCollapsed={sidebarCollapsed}
          isMobile={isMobile}
        />
        
        {/* Page Content */}
        <main className="p-3 sm:p-4 lg:p-6 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
      
      {/* Voice Control Floating Button - hide on small screens */}
      <div className="hidden sm:block">
        <VoiceControl />
      </div>
      
      {/* Update Notification */}
      <UpdateNotification />
    </div>
  );
}

export default MainLayout;
