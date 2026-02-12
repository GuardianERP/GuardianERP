/**
 * Overlay Notification Component
 * Shows urgent reminder notifications as slide-in cards
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, CheckSquare, Bell, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OverlayNotification = ({ notifications, onDismiss, onDismissAll }) => {
  const navigate = useNavigate();

  const getIcon = (type) => {
    switch (type) {
      case 'meeting':
        return <Calendar className="w-6 h-6 text-blue-400" />;
      case 'task':
        return <CheckSquare className="w-6 h-6 text-green-400" />;
      case 'reminder':
        return <Bell className="w-6 h-6 text-yellow-400" />;
      default:
        return <Bell className="w-6 h-6 text-gray-400" />;
    }
  };

  const getBorderColor = (type, urgent) => {
    if (urgent) return 'border-l-4 border-l-red-500';
    switch (type) {
      case 'meeting':
        return 'border-l-4 border-l-blue-500';
      case 'task':
        return 'border-l-4 border-l-green-500';
      case 'reminder':
        return 'border-l-4 border-l-yellow-500';
      default:
        return 'border-l-4 border-l-gray-500';
    }
  };

  const handleNavigate = (notification) => {
    if (notification.type === 'meeting') {
      navigate('/meetings');
    } else if (notification.type === 'task') {
      navigate('/tasks');
    } else if (notification.type === 'reminder') {
      navigate('/tasks'); // Reminders are on tasks page
    }
    onDismiss(notification.id);
  };

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {notifications.map((notification, index) => (
        <div
          key={notification.id || index}
          className={`
            pointer-events-auto
            bg-white dark:bg-gray-800 
            rounded-lg shadow-2xl 
            ${getBorderColor(notification.type, notification.urgent)}
            transform transition-all duration-300 ease-out
            animate-slideIn
            hover:scale-[1.02]
          `}
          style={{
            animation: `slideIn 0.3s ease-out ${index * 0.1}s backwards`
          }}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {notification.message}
                </p>
                {notification.urgent && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 mt-2">
                    Urgent
                  </span>
                )}
              </div>
              <button
                onClick={() => onDismiss(notification.id || index)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => onDismiss(notification.id || index)}
                className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleNavigate(notification)}
                className="px-3 py-1.5 text-xs bg-blue-500 text-white hover:bg-blue-600 rounded-md transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View
              </button>
            </div>
          </div>
        </div>
      ))}
      
      {notifications.length > 1 && (
        <button
          onClick={onDismissAll}
          className="pointer-events-auto self-end text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Dismiss all ({notifications.length})
        </button>
      )}
    </div>
  );
};

export default OverlayNotification;
