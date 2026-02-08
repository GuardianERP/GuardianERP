/**
 * Guardian ERP Mobile - OTA Update Service
 * Handles automatic app updates from server
 */

import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { isMobile, getDeviceInfo, notifications, toast, storage } from './platformService';
import { supabase } from './supabaseClient';

// Current app version (matches package.json)
const CURRENT_VERSION = '2.0.1';

// Update check interval (4 hours)
const CHECK_INTERVAL = 4 * 60 * 60 * 1000;

let updateCheckTimer = null;
let updateState = {
  currentVersion: CURRENT_VERSION,
  latestVersion: null,
  updateAvailable: false,
  updateUrl: null,
  releaseNotes: null,
  lastChecked: null,
};

/**
 * Compare version strings (semver)
 */
const compareVersions = (v1, v2) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

/**
 * Check for updates from Supabase
 */
export const checkForUpdate = async () => {
  try {
    const deviceInfo = await getDeviceInfo();
    const platform = deviceInfo.platform || 'web';
    
    console.log('[Update] Checking for updates... Current:', CURRENT_VERSION, 'Platform:', platform);
    
    // Query the app_updates table for the latest version
    const { data, error } = await supabase
      .from('app_updates')
      .select('*')
      .eq('platform', platform === 'web' ? 'web' : (platform === 'ios' ? 'ios' : 'android'))
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('[Update] Error checking for updates:', error);
      return { updateAvailable: false, error: error.message };
    }
    
    updateState.lastChecked = new Date().toISOString();
    await storage.set('update_last_checked', updateState.lastChecked);
    
    if (!data) {
      console.log('[Update] No update info found in database');
      return { updateAvailable: false };
    }
    
    const latestVersion = data.version;
    const isNewer = compareVersions(latestVersion, CURRENT_VERSION) > 0;
    
    updateState.latestVersion = latestVersion;
    updateState.updateAvailable = isNewer;
    updateState.updateUrl = data.download_url;
    updateState.releaseNotes = data.release_notes;
    
    if (isNewer) {
      console.log('[Update] Update available:', latestVersion);
      
      // Notify user
      if (isMobile()) {
        await notifications.show(
          'Update Available',
          `Version ${latestVersion} is available. Tap to update.`,
          { action: 'update' }
        );
      }
      
      // Dispatch event for app to handle
      window.dispatchEvent(new CustomEvent('guardian:update_available', {
        detail: {
          currentVersion: CURRENT_VERSION,
          latestVersion,
          releaseNotes: data.release_notes,
          downloadUrl: data.download_url,
          isMandatory: data.is_mandatory,
        }
      }));
      
      return {
        updateAvailable: true,
        currentVersion: CURRENT_VERSION,
        latestVersion,
        releaseNotes: data.release_notes,
        downloadUrl: data.download_url,
        isMandatory: data.is_mandatory,
      };
    }
    
    console.log('[Update] App is up to date');
    return { updateAvailable: false, currentVersion: CURRENT_VERSION };
    
  } catch (error) {
    console.error('[Update] Check failed:', error);
    return { updateAvailable: false, error: error.message };
  }
};

/**
 * Download and install update (mobile only)
 */
export const downloadUpdate = async () => {
  if (!updateState.updateUrl) {
    toast.show('No update URL available');
    return false;
  }
  
  if (isMobile()) {
    // On mobile, open the download URL (Play Store / App Store link)
    // or direct APK download
    const deviceInfo = await getDeviceInfo();
    
    if (deviceInfo.platform === 'android') {
      // For Android, can download APK directly or open Play Store
      window.open(updateState.updateUrl, '_system');
      toast.show('Opening download...');
    } else if (deviceInfo.platform === 'ios') {
      // For iOS, open App Store
      window.open(updateState.updateUrl, '_system');
      toast.show('Opening App Store...');
    }
    return true;
  } else {
    // Web update - just refresh the page (PWA will get new version)
    window.location.reload();
    return true;
  }
};

/**
 * Start automatic update checking
 */
export const startAutoUpdateCheck = () => {
  // Check immediately
  checkForUpdate();
  
  // Set up periodic checks
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
  }
  updateCheckTimer = setInterval(checkForUpdate, CHECK_INTERVAL);
  
  console.log('[Update] Auto-update check started (every', CHECK_INTERVAL / 1000 / 60, 'minutes)');
};

/**
 * Stop automatic update checking
 */
export const stopAutoUpdateCheck = () => {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
};

/**
 * Get current update state
 */
export const getUpdateState = () => ({ ...updateState });

/**
 * Get current app version
 */
export const getAppVersion = () => CURRENT_VERSION;

/**
 * Listen for real-time update notifications
 */
export const subscribeToUpdates = () => {
  const channel = supabase.channel('app_updates_channel');
  
  channel.on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'app_updates',
  }, (payload) => {
    console.log('[Update] New update published:', payload);
    checkForUpdate();
  });
  
  channel.subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
};

export default {
  checkForUpdate,
  downloadUpdate,
  startAutoUpdateCheck,
  stopAutoUpdateCheck,
  getUpdateState,
  getAppVersion,
  subscribeToUpdates,
  CURRENT_VERSION,
};
