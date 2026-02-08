/**
 * Guardian Desktop ERP - Loading Spinner Component
 * Reusable spinner for async operations
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

// Full page loading spinner
export const FullPageSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
      </div>
    </div>
  );
};

// Inline loading spinner
export const InlineSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <Loader2 className={`animate-spin text-blue-500 ${sizeClasses[size]} ${className}`} />
  );
};

// Card loading skeleton
export const CardSkeleton = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          </div>
        </div>
      ))}
    </>
  );
};

// Table loading skeleton
export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 dark:bg-gray-600 rounded flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="px-6 py-4 flex gap-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
          >
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Stats loading skeleton
export const StatsSkeleton = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Loading wrapper component with automatic spinner
export const LoadingWrapper = ({ 
  loading, 
  error, 
  children, 
  skeleton = null,
  message = 'Loading...',
  errorMessage = 'An error occurred'
}) => {
  if (loading) {
    return skeleton || (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <InlineSpinner size="lg" />
          <p className="text-gray-500 dark:text-gray-400">{message}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium">{errorMessage}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{error.message || error}</p>
        </div>
      </div>
    );
  }

  return children;
};

// Button with loading state
export const LoadingButton = ({
  loading,
  disabled,
  children,
  className = '',
  loadingText = 'Loading...',
  ...props
}) => {
  return (
    <button
      disabled={loading || disabled}
      className={`relative ${className}`}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <InlineSpinner size="sm" />
        </span>
      )}
      <span className={loading ? 'invisible' : ''}>
        {loading ? loadingText : children}
      </span>
    </button>
  );
};

export default {
  FullPageSpinner,
  InlineSpinner,
  CardSkeleton,
  TableSkeleton,
  StatsSkeleton,
  LoadingWrapper,
  LoadingButton,
};
