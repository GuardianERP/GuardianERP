/**
 * Guardian Desktop ERP - Presence Service
 * Automatically tracks which employees have the app open using Supabase Realtime Presence
 * No manual clock-in needed - if app is open, employee is online
 */

import { supabase } from './supabaseClient';

const PRESENCE_CHANNEL = 'employee-presence';

class PresenceService {
  constructor() {
    this.channel = null;
    this.presenceState = {};
    this.onPresenceChangeCallbacks = [];
    this.currentUser = null;
  }

  /**
   * Initialize presence tracking for the current user
   * Call this when user logs in
   */
  async init(user) {
    if (!user?.employeeId) {
      console.warn('[Presence] No employeeId provided');
      return;
    }

    this.currentUser = user;
    
    // Create or get the presence channel
    this.channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: {
          key: user.employeeId,
        },
      },
    });

    // Listen for presence changes (sync)
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const newState = this.channel.presenceState();
        this.presenceState = newState;
        console.log('[Presence] Sync - Online users:', Object.keys(newState).length);
        this.notifyListeners();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Presence] User joined:', key);
        this.notifyListeners();
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] User left:', key);
        this.notifyListeners();
      });

    // Subscribe to channel
    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
    // Track this user's presence
        await this.channel.track({
          employeeId: user.employeeId,
          email: user.email,
          name: user.fullName || (user.firstName + ' ' + user.lastName) || user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          online_at: new Date().toISOString(),
        });
        console.log('[Presence] User is now being tracked:', user.email, 'Name:', user.fullName);
      }
    });

    // Handle window close/unload to properly leave presence
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    return true;
  }

  /**
   * Get all online users
   */
  getOnlineUsers() {
    const online = {};
    Object.entries(this.presenceState).forEach(([key, presences]) => {
      if (presences && presences.length > 0) {
        online[key] = presences[0]; // Get first presence entry
      }
    });
    return online;
  }

  /**
   * Check if a specific employee is online
   */
  isOnline(employeeId) {
    return !!this.presenceState[employeeId]?.length;
  }

  /**
   * Get list of online employee IDs
   */
  getOnlineEmployeeIds() {
    return Object.keys(this.presenceState).filter(
      key => this.presenceState[key]?.length > 0
    );
  }

  /**
   * Subscribe to presence changes
   */
  onPresenceChange(callback) {
    this.onPresenceChangeCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.onPresenceChangeCallbacks = this.onPresenceChangeCallbacks.filter(
        cb => cb !== callback
      );
    };
  }

  /**
   * Notify all listeners of presence changes
   */
  notifyListeners() {
    const onlineUsers = this.getOnlineUsers();
    this.onPresenceChangeCallbacks.forEach(callback => {
      try {
        callback(onlineUsers);
      } catch (err) {
        console.error('[Presence] Error in callback:', err);
      }
    });
  }

  /**
   * Cleanup presence when user logs out or closes app
   */
  async cleanup() {
    if (this.channel) {
      await this.channel.untrack();
      await this.channel.unsubscribe();
      this.channel = null;
    }
    this.presenceState = {};
    this.currentUser = null;
  }
}

// Export singleton instance
export const presenceService = new PresenceService();
export default presenceService;
