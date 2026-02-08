/**
 * Guardian Desktop ERP - Auto-Updater Module
 * Handles automatic application updates
 */

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Update settings
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// State
let mainWindow = null;
let updateAvailable = false;
let updateDownloaded = false;
let updateInfo = null;

/**
 * Initialize the auto-updater
 * @param {BrowserWindow} win - Main browser window
 */
export function initAutoUpdater(win) {
  mainWindow = win;
  
  // Set up event handlers
  setupEventHandlers();
  
  // Set up IPC handlers
  setupIPCHandlers();
  
  // Check for updates after window is ready
  setTimeout(() => {
    checkForUpdates(false);
  }, 5000);
}

/**
 * Set up auto-updater event handlers
 */
function setupEventHandlers() {
  // Checking for updates
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    sendToRenderer('update-checking');
  });
  
  // Update available
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    updateAvailable = true;
    updateInfo = info;
    sendToRenderer('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });
  
  // No update available
  autoUpdater.on('update-not-available', (info) => {
    log.info('No updates available');
    updateAvailable = false;
    sendToRenderer('update-not-available', {
      currentVersion: app.getVersion(),
    });
  });
  
  // Download progress
  autoUpdater.on('download-progress', (progressObj) => {
    const message = `Download speed: ${Math.round(progressObj.bytesPerSecond / 1024)} KB/s`;
    log.info(message, `${Math.round(progressObj.percent)}%`);
    sendToRenderer('update-download-progress', {
      percent: progressObj.percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  });
  
  // Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    updateDownloaded = true;
    sendToRenderer('update-downloaded', {
      version: info.version,
    });
    
    // Show notification to user
    showUpdateNotification(info);
  });
  
  // Error handling
  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
    sendToRenderer('update-error', {
      message: error.message,
    });
  });
}

/**
 * Set up IPC handlers for renderer communication
 */
function setupIPCHandlers() {
  // Check for updates manually
  ipcMain.handle('check-for-updates', async () => {
    return await checkForUpdates(true);
  });
  
  // Download update
  ipcMain.handle('download-update', async () => {
    if (updateAvailable && !updateDownloaded) {
      autoUpdater.downloadUpdate();
      return true;
    }
    return false;
  });
  
  // Install update (quit and install)
  ipcMain.handle('install-update', async () => {
    if (updateDownloaded) {
      autoUpdater.quitAndInstall(false, true);
      return true;
    }
    return false;
  });
  
  // Get current version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });
  
  // Get update status
  ipcMain.handle('get-update-status', () => {
    return {
      checking: false,
      available: updateAvailable,
      downloaded: updateDownloaded,
      info: updateInfo,
      currentVersion: app.getVersion(),
    };
  });
}

/**
 * Check for updates
 * @param {boolean} manual - Whether this is a manual check
 */
async function checkForUpdates(manual = false) {
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      success: true,
      updateAvailable: result?.updateInfo?.version !== app.getVersion(),
      version: result?.updateInfo?.version,
    };
  } catch (error) {
    log.error('Error checking for updates:', error);
    if (manual) {
      dialog.showErrorBox(
        'Update Check Failed',
        `Could not check for updates: ${error.message}`
      );
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Show update notification dialog
 * @param {object} info - Update info
 */
function showUpdateNotification(info) {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart Now', 'Later'],
    title: 'Update Ready',
    message: `Guardian ERP v${info.version}`,
    detail: 'A new version has been downloaded. Restart the application to apply the updates.',
  };

  dialog.showMessageBox(mainWindow, dialogOpts).then((response) => {
    if (response.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });
}

/**
 * Send message to renderer process
 * @param {string} channel - IPC channel name
 * @param {object} data - Data to send
 */
function sendToRenderer(channel, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

/**
 * Set feed URL for updates (for testing or custom update servers)
 * @param {string} url - Update feed URL
 */
export function setFeedURL(url) {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: url,
  });
}

export default {
  initAutoUpdater,
  setFeedURL,
};
