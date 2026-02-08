/**
 * Guardian Desktop ERP - Update Hook
 * React hook for handling auto-updates in the renderer process
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for auto-update functionality
 * @returns {object} Update state and methods
 */
export function useAutoUpdate() {
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [error, setError] = useState(null);
  const [currentVersion, setCurrentVersion] = useState('');
  
  // Initialize and set up event listeners
  useEffect(() => {
    // Get current version
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(setCurrentVersion);
    }
    
    // Get initial update status
    if (window.electronAPI?.getUpdateStatus) {
      window.electronAPI.getUpdateStatus().then((status) => {
        setUpdateAvailable(status.available);
        setUpdateDownloaded(status.downloaded);
        setUpdateInfo(status.info);
        setCurrentVersion(status.currentVersion);
      });
    }
    
    // Set up IPC listeners
    const removeListeners = [];
    
    if (window.electronAPI?.onUpdateChecking) {
      const remove = window.electronAPI.onUpdateChecking(() => {
        setIsChecking(true);
        setError(null);
      });
      removeListeners.push(remove);
    }
    
    if (window.electronAPI?.onUpdateAvailable) {
      const remove = window.electronAPI.onUpdateAvailable((info) => {
        setIsChecking(false);
        setUpdateAvailable(true);
        setUpdateInfo(info);
      });
      removeListeners.push(remove);
    }
    
    if (window.electronAPI?.onUpdateNotAvailable) {
      const remove = window.electronAPI.onUpdateNotAvailable(() => {
        setIsChecking(false);
        setUpdateAvailable(false);
      });
      removeListeners.push(remove);
    }
    
    if (window.electronAPI?.onUpdateDownloadProgress) {
      const remove = window.electronAPI.onUpdateDownloadProgress((progress) => {
        setDownloadProgress(progress);
      });
      removeListeners.push(remove);
    }
    
    if (window.electronAPI?.onUpdateDownloaded) {
      const remove = window.electronAPI.onUpdateDownloaded((info) => {
        setUpdateDownloaded(true);
        setDownloadProgress(null);
        setUpdateInfo(info);
      });
      removeListeners.push(remove);
    }
    
    if (window.electronAPI?.onUpdateError) {
      const remove = window.electronAPI.onUpdateError((err) => {
        setIsChecking(false);
        setError(err.message);
      });
      removeListeners.push(remove);
    }
    
    return () => {
      removeListeners.forEach(remove => remove && remove());
    };
  }, []);
  
  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if (!window.electronAPI?.checkForUpdates) {
      setError('Update check not available in this environment');
      return false;
    }
    
    setIsChecking(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.checkForUpdates();
      return result.success && result.updateAvailable;
    } catch (err) {
      setError(err.message || 'Failed to check for updates');
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);
  
  // Download update
  const downloadUpdate = useCallback(async () => {
    if (!window.electronAPI?.downloadUpdate) {
      setError('Download not available in this environment');
      return false;
    }
    
    try {
      return await window.electronAPI.downloadUpdate();
    } catch (err) {
      setError(err.message || 'Failed to download update');
      return false;
    }
  }, []);
  
  // Install update (quit and install)
  const installUpdate = useCallback(async () => {
    if (!window.electronAPI?.installUpdate) {
      setError('Install not available in this environment');
      return false;
    }
    
    try {
      return await window.electronAPI.installUpdate();
    } catch (err) {
      setError(err.message || 'Failed to install update');
      return false;
    }
  }, []);
  
  return {
    // State
    isChecking,
    updateAvailable,
    updateDownloaded,
    downloadProgress,
    updateInfo,
    error,
    currentVersion,
    
    // Methods
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  };
}

export default useAutoUpdate;
