/**
 * Guardian Desktop ERP - Update Notification Component
 * Shows update status and download progress
 * Works for BOTH installed (NSIS) and portable users
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
  ExternalLink,
  Megaphone,
} from 'lucide-react';
import { useAutoUpdate } from '../hooks/useAutoUpdate';

// GitHub release info for manual checking (works for portable users too)
const GITHUB_OWNER = 'GuardianERP';
const GITHUB_REPO = 'GuardianERP';
const CURRENT_VERSION = '2.6.8'; // Update this with each release

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
  
  // GitHub-based update check (works for portable users)
  const [githubUpdate, setGithubUpdate] = useState(null);
  const [githubChecking, setGithubChecking] = useState(false);
  
  // Proper semver comparison: returns true if a > b
  const isNewerVersion = (a, b) => {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA > numB) return true;
      if (numA < numB) return false;
    }
    return false;
  };

  // Check GitHub for updates on mount (fallback for portable users)
  useEffect(() => {
    const checkGitHubReleases = async () => {
      try {
        setGithubChecking(true);
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
        );
        if (response.ok) {
          const release = await response.json();
          const latestVersion = release.tag_name.replace('v', '');
          const appVersion = currentVersion && currentVersion !== '' ? currentVersion : CURRENT_VERSION;
          
          // Compare versions using proper semver comparison
          if (isNewerVersion(latestVersion, appVersion)) {
            const exeAsset = release.assets.find(a => 
              a.name.endsWith('.exe') && !a.name.includes('blockmap')
            );
            setGithubUpdate({
              version: latestVersion,
              releaseNotes: release.body,
              downloadUrl: exeAsset?.browser_download_url || release.html_url,
              htmlUrl: release.html_url,
              publishedAt: release.published_at,
            });
          }
        }
      } catch (err) {
        console.log('GitHub update check failed:', err.message);
      } finally {
        setGithubChecking(false);
      }
    };
    
    // Check after 3 seconds to not block app load
    const timer = setTimeout(checkGitHubReleases, 5000);
    return () => clearTimeout(timer);
  }, [currentVersion]);
  
  // Show notification when update is available
  useEffect(() => {
    if (updateAvailable || updateDownloaded || githubUpdate) {
      setIsDismissed(false);
    }
  }, [updateAvailable, updateDownloaded, githubUpdate]);
  
  // Open download in browser (for portable users)
  const openDownloadInBrowser = () => {
    const url = githubUpdate?.downloadUrl || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };
  
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
  if (!updateAvailable && !updateDownloaded && !isChecking && !error && !githubUpdate) {
    return null;
  }
  
  return (
    <>
      {/* PROMINENT TOP BANNER for GitHub-detected updates (works for portable users) */}
      {githubUpdate && !updateDownloaded && !updateAvailable && !isDismissed && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white shadow-lg animate-slide-down">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-lg">
                    🎉 New Version Available: v{githubUpdate.version}
                  </p>
                  <p className="text-sm text-white/90">
                    Click to download the latest version with new features and improvements
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openDownloadInBrowser}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Download Now
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDismissed(true)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }
      `}</style>
    </div>
    </>
  );
}

export default UpdateNotification;
