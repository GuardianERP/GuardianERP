/**
 * Guardian Desktop ERP - Toast Notification Component
 * Shows error and success notifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

// Toast types with icons and colors
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-600',
    borderColor: 'border-green-500',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-600',
    borderColor: 'border-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-600',
    borderColor: 'border-yellow-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-600',
    borderColor: 'border-blue-500',
  },
};

// Toast context for global access
let addToastGlobal = null;

export function setToastHandler(handler) {
  addToastGlobal = handler;
}

// Global toast functions
export const toast = {
  success: (message, options = {}) => addToastGlobal?.({ type: 'success', message, ...options }),
  error: (message, options = {}) => addToastGlobal?.({ type: 'error', message, ...options }),
  warning: (message, options = {}) => addToastGlobal?.({ type: 'warning', message, ...options }),
  info: (message, options = {}) => addToastGlobal?.({ type: 'info', message, ...options }),
};

// Single Toast Item
function ToastItem({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border ${config.bgColor} ${config.borderColor} text-white transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-semibold mb-1">{toast.title}</p>
        )}
        <p className="text-sm text-white/90">{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => {
              toast.action.onClick();
              handleDismiss();
            }}
            className="mt-2 text-sm font-medium underline hover:no-underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Toast Container Component
function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }].slice(-5)); // Max 5 toasts
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register global handler
  useEffect(() => {
    setToastHandler(addToast);
    return () => setToastHandler(null);
  }, [addToast]);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>,
    document.body
  );
}

export default ToastContainer;
