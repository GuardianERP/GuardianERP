/**
 * Guardian ERP Mobile - Real-time Sync Service
 * Ensures data is automatically synchronized between mobile and desktop
 * when a user is logged in on multiple devices
 */

import { supabase } from './supabaseClient';
import { storage, notifications, getDeviceInfo, getNetworkStatus, onNetworkChange } from './platformService';

// Store for sync state
let syncState = {
  lastSyncTime: null,
  deviceId: null,
  userId: null,
  isOnline: true,
  pendingChanges: [],
};

// Realtime channel references
let userSyncChannel = null;
let presenceChannel = null;

/**
 * Initialize sync service for a user
 */
export const initSync = async (userId) => {
  if (!userId) {
    console.warn('[Sync] No userId provided');
    return;
  }
  
  syncState.userId = userId;
  
  // Get device info
  const deviceInfo = await getDeviceInfo();
  syncState.deviceId = deviceInfo.deviceId;
  
  // Check network status
  const networkStatus = await getNetworkStatus();
  syncState.isOnline = networkStatus.connected;
  
  // Listen for network changes
  onNetworkChange((status) => {
    syncState.isOnline = status.connected;
    if (status.connected) {
      // When back online, sync any pending changes
      processPendingChanges();
    }
  });
  
  // Set up realtime sync channel for this user
  await setupSyncChannel(userId);
  
  // Set up presence to track active devices
  await setupPresence(userId);
  
  // Load any pending changes from storage
  const pending = await storage.get(`sync_pending_${userId}`);
  if (pending) {
    syncState.pendingChanges = pending;
    if (syncState.isOnline) {
      processPendingChanges();
    }
  }
  
  console.log('[Sync] Initialized for user:', userId, 'device:', syncState.deviceId);
};

/**
 * Set up realtime sync channel
 */
const setupSyncChannel = async (userId) => {
  // Clean up existing channel
  if (userSyncChannel) {
    await supabase.removeChannel(userSyncChannel);
  }
  
  // Create a channel for user-specific sync events
  userSyncChannel = supabase.channel(`sync:${userId}`, {
    config: { broadcast: { self: false } }
  });
  
  // Listen for sync events from other devices
  userSyncChannel.on('broadcast', { event: 'data_changed' }, async (payload) => {
    console.log('[Sync] Received data change from another device:', payload);
    
    const { table, action, data, fromDevice } = payload.payload;
    
    // Don't process our own changes
    if (fromDevice === syncState.deviceId) return;
    
    // Notify the app about the change
    window.dispatchEvent(new CustomEvent('guardian:sync', {
      detail: { table, action, data, fromDevice }
    }));
    
    // Show notification if app is in background
    if (document.hidden) {
      await notifications.show(
        'Data Updated',
        `${table} was ${action} from another device`,
        { table, action }
      );
    }
  });
  
  // Listen for force logout events
  userSyncChannel.on('broadcast', { event: 'force_logout' }, async (payload) => {
    if (payload.payload.fromDevice !== syncState.deviceId) {
      console.log('[Sync] Force logout received');
      window.dispatchEvent(new CustomEvent('guardian:force_logout'));
    }
  });
  
  // Listen for settings sync
  userSyncChannel.on('broadcast', { event: 'settings_changed' }, async (payload) => {
    console.log('[Sync] Settings changed on another device');
    window.dispatchEvent(new CustomEvent('guardian:settings_sync', {
      detail: payload.payload
    }));
  });
  
  await userSyncChannel.subscribe();
};

/**
 * Set up presence tracking
 */
const setupPresence = async (userId) => {
  // Clean up existing channel
  if (presenceChannel) {
    await supabase.removeChannel(presenceChannel);
  }
  
  const deviceInfo = await getDeviceInfo();
  
  presenceChannel = supabase.channel(`presence:${userId}`);
  
  presenceChannel.on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    const activeDevices = Object.keys(state).length;
    console.log('[Sync] Active devices:', activeDevices);
    
    window.dispatchEvent(new CustomEvent('guardian:presence', {
      detail: { activeDevices, devices: state }
    }));
  });
  
  presenceChannel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
    console.log('[Sync] Device joined:', newPresences);
  });
  
  presenceChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    console.log('[Sync] Device left:', leftPresences);
  });
  
  await presenceChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        deviceId: syncState.deviceId,
        platform: deviceInfo.platform,
        model: deviceInfo.model || 'unknown',
        lastActive: new Date().toISOString(),
      });
    }
  });
};

/**
 * Broadcast a data change to other devices
 */
export const broadcastChange = async (table, action, data) => {
  if (!userSyncChannel || !syncState.userId) {
    console.warn('[Sync] Cannot broadcast - not initialized');
    return;
  }
  
  const change = {
    table,
    action,
    data,
    fromDevice: syncState.deviceId,
    timestamp: new Date().toISOString(),
  };
  
  if (syncState.isOnline) {
    await userSyncChannel.send({
      type: 'broadcast',
      event: 'data_changed',
      payload: change,
    });
  } else {
    // Queue for later sync
    syncState.pendingChanges.push(change);
    await storage.set(`sync_pending_${syncState.userId}`, syncState.pendingChanges);
  }
};

/**
 * Broadcast settings change
 */
export const broadcastSettings = async (settings) => {
  if (!userSyncChannel) return;
  
  await userSyncChannel.send({
    type: 'broadcast',
    event: 'settings_changed',
    payload: {
      settings,
      fromDevice: syncState.deviceId,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Force logout on all other devices
 */
export const forceLogoutOtherDevices = async () => {
  if (!userSyncChannel) return;
  
  await userSyncChannel.send({
    type: 'broadcast',
    event: 'force_logout',
    payload: {
      fromDevice: syncState.deviceId,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Process pending changes when back online
 */
const processPendingChanges = async () => {
  if (!syncState.pendingChanges.length) return;
  
  console.log('[Sync] Processing', syncState.pendingChanges.length, 'pending changes');
  
  for (const change of syncState.pendingChanges) {
    try {
      await userSyncChannel.send({
        type: 'broadcast',
        event: 'data_changed',
        payload: change,
      });
    } catch (error) {
      console.error('[Sync] Failed to sync change:', error);
      return; // Stop if any fail - will retry later
    }
  }
  
  // Clear pending changes
  syncState.pendingChanges = [];
  await storage.remove(`sync_pending_${syncState.userId}`);
};

/**
 * Clean up sync service
 */
export const cleanupSync = async () => {
  if (userSyncChannel) {
    await supabase.removeChannel(userSyncChannel);
    userSyncChannel = null;
  }
  if (presenceChannel) {
    await supabase.removeChannel(presenceChannel);
    presenceChannel = null;
  }
  syncState = {
    lastSyncTime: null,
    deviceId: null,
    userId: null,
    isOnline: true,
    pendingChanges: [],
  };
};

/**
 * Get current sync state
 */
export const getSyncState = () => ({ ...syncState });

export default {
  initSync,
  cleanupSync,
  broadcastChange,
  broadcastSettings,
  forceLogoutOtherDevices,
  getSyncState,
};
