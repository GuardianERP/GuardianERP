/**
 * Guardian Desktop ERP - Loading Screen
 * Full page loading indicator
 */

import React from 'react';
import { Shield } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Shield className="w-10 h-10 text-white" />
            </div>
            {/* Pulse animation */}
            <div className="absolute inset-0 w-20 h-20 bg-blue-600 rounded-2xl animate-ping opacity-20" />
          </div>
        </div>
        
        {/* App Name */}
        <h1 className="text-2xl font-bold text-white mb-2">Guardian ERP</h1>
        <p className="text-blue-200 text-sm mb-8">Loading your workspace...</p>
        
        {/* Loading Spinner */}
        <div className="flex justify-center">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
