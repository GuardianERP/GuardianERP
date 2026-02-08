/**
 * Guardian Desktop ERP - Update Notification Component
 * Shows update status and download progress
 */

import React, { useState, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAutoUpdate } from '../hooks/useAutoUpdate';

function UpdateNotification() {
  const {
    isChecking,
    updateAvailable,
    updateDownloaded,
    downloadProgress,
    updateInfo,
    error,
    currentVersion,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  } = useAutoUpdate();
  
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Show notification when update is available
  useEffect(() => {
    if (updateAvailable || updateDownloaded) {
      setIsDismissed(false);
    }
  }, [updateAvailable, updateDownloaded]);
  
  // Handle download
  const handleDownload = async () => {
    setIsDownloading(true);
    await downloadUpdate();
    setIsDownloading(false);
  };
  
  // Don't show if dismissed or no update
  if (isDismissed && !updateDownloaded) {
    return null;
  }
  
  // Don't show if no update available and not checking
  if (!updateAvailable && !updateDownloaded && !isChecking && !error) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {/* Error State */}
      {error && !updateAvailable && (
        <div className="bg-red-900/90 backdrop-blur border border-red-700 rounded-2xl p-4 shadow-2xl animate-slide-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-white">Update Check Failed</p>
              <p className="text-sm text-red-200 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-red-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Update Downloaded - Ready to Install */}
      {updateDownloaded && (
        <div className="bg-green-900/90 backdrop-blur border border-green-700 rounded-2xl p-4 shadow-2xl animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Update Ready</p>
              <p className="text-sm text-green-200 mt-1">
                Version {updateInfo?.version || 'new'} has been downloaded.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={installUpdate}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Restart & Update
                </button>
                <button
                  onClick={() => setIsDismissed(true)}
                  className="px-4 py-2 bg-green-800 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Downloading Update */}
      {downloadProgress && !updateDownloaded && (
        <div className="bg-blue-900/90 backdrop-blur border border-blue-700 rounded-2xl p-4 shadow-2xl animate-slide-in">
          <div className="flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-white">Downloading Update</p>
              <p className="text-sm text-blue-200 mt-1">
                {Math.round(downloadProgress.bytesPerSecond / 1024)} KB/s
              </p>
              <div className="mt-3">
                <div className="h-2 bg-blue-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress.percent}%` }}
                  />
                </div>
                <p className="text-xs text-blue-300 mt-1 text-right">
                  {Math.round(downloadProgress.percent)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Update Available */}
      {updateAvailable && !updateDownloaded && !downloadProgress && (
        <div className="bg-purple-900/90 backdrop-blur border border-purple-700 rounded-2xl p-4 shadow-2xl animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Update Available</p>
              <p className="text-sm text-purple-200 mt-1">
                Version {updateInfo?.version || 'new'} is available.
              </p>
              {updateInfo?.releaseNotes && (
                <p className="text-xs text-purple-300 mt-2 line-clamp-2">
                  {typeof updateInfo.releaseNotes === 'string' 
                    ? updateInfo.releaseNotes 
                    : 'New features and improvements'}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download
                </button>
                <button
                  onClick={() => setIsDismissed(true)}
                  className="px-4 py-2 bg-purple-800 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-purple-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Checking for Updates */}
      {isChecking && !updateAvailable && (
        <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-2xl p-4 shadow-2xl animate-slide-in">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <p className="text-sm text-gray-300">Checking for updates...</p>
          </div>
        </div>
      )}
      
      {/* Styles */}
      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default UpdateNotification;
