/**
 * Guardian Desktop ERP - Auto-Updater Module
 * Handles automatic application updates via GitHub Releases
 */

const { app, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

// State
let mainWindow = null;
let updateAvailable = false;
let updateDownloaded = false;
let updateInfo = null;

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

/**
 * Initialize the auto-updater
 * @param {BrowserWindow} win - Main browser window
 */
function initAutoUpdater(win) {
  mainWindow = win;

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...');
    sendToRenderer('update-checking');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    updateAvailable = true;
    updateInfo = info;
    sendToRenderer('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] No updates available. Current:', app.getVersion());
    updateAvailable = false;
    sendToRenderer('update-not-available', {
      currentVersion: app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Updater] Download: ${Math.round(progress.percent)}%`);
    sendToRenderer('update-download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);
    updateDownloaded = true;
    sendToRenderer('update-downloaded', { version: info.version });

    // Show dialog to user
    const dialogOpts = {
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      title: 'Update Ready',
      message: `Guardian ERP v${info.version}`,
      detail: 'A new version has been downloaded. Restart to apply the update.',
    };

    dialog.showMessageBox(mainWindow, dialogOpts).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('[Updater] Error:', error.message);
    sendToRenderer('update-error', { message: error.message });
  });

  // IPC handlers
  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        success: true,
        updateAvailable: result?.updateInfo?.version !== app.getVersion(),
        version: result?.updateInfo?.version,
      };
    } catch (error) {
      console.error('[Updater] Check failed:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('download-update', async () => {
    if (updateAvailable && !updateDownloaded) {
      autoUpdater.downloadUpdate();
      return true;
    }
    return false;
  });

  ipcMain.handle('install-update', async () => {
    if (updateDownloaded) {
      autoUpdater.quitAndInstall(false, true);
      return true;
    }
    return false;
  });

  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('get-update-status', () => ({
    available: updateAvailable,
    downloaded: updateDownloaded,
    info: updateInfo,
    currentVersion: app.getVersion(),
  }));

  // Check for updates 10 seconds after launch
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('[Updater] Initial check failed:', err.message);
    });
  }, 10000);
}

function sendToRenderer(channel, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

module.exports = { initAutoUpdater };
