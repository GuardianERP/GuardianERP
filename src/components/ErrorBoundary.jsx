/**
 * Guardian Desktop ERP - Error Boundary Component
 * Catches React rendering errors and displays fallback UI
 */

import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { handleError } from '../services/errorService';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    // Log error to service
    handleError(error, {
      category: 'ui',
      componentStack: errorInfo.componentStack,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  copyErrorDetails = () => {
    const { error, errorInfo } = this.state;
    const details = `Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
Time: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}`;

    navigator.clipboard.writeText(details).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, copied } = this.state;

      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-400">
                An unexpected error occurred. Don't worry, your data is safe.
              </p>
            </div>

            {/* Error Summary */}
            <div className="bg-gray-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Bug className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-400 mb-1">Error Message</p>
                  <p className="text-sm text-gray-300 break-words">
                    {error?.message || 'An unknown error occurred'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={this.handleRetry}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Try Again</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                <Home className="w-5 h-5" />
                <span>Go Home</span>
              </button>
            </div>

            {/* Technical Details Toggle */}
            <button
              onClick={this.toggleDetails}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 rounded-xl text-gray-400 hover:bg-gray-800 transition-colors mb-4"
            >
              <span className="text-sm">Technical Details</span>
              {showDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Technical Details */}
            {showDetails && (
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-700/50 border-b border-gray-700">
                  <span className="text-xs text-gray-400">Stack Trace</span>
                  <button
                    onClick={this.copyErrorDetails}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Details</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs text-gray-400 overflow-x-auto max-h-64 overflow-y-auto">
                  {error?.stack || 'No stack trace available'}
                </pre>
                {errorInfo?.componentStack && (
                  <>
                    <div className="px-4 py-2 bg-gray-700/50 border-t border-gray-700">
                      <span className="text-xs text-gray-400">Component Stack</span>
                    </div>
                    <pre className="p-4 text-xs text-gray-400 overflow-x-auto max-h-40 overflow-y-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}

            {/* Help Text */}
            <p className="text-center text-xs text-gray-500 mt-6">
              If this problem persists, please contact support with the error details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
