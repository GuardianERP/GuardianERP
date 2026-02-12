/**
 * Guardian Desktop ERP - Notification Service
 * Handles auto-notifications: welcome (new employee), birthday, chat
 * Now with native desktop notifications!
 */

import { supabase } from './supabaseClient';

/**
 * Show a native notification
 * Works even when app is minimized or user is in another window
 */
const showNativeNotification = async (title, body) => {
  try {
    // Try Electron native notification first (for desktop app)
    if (window.electronAPI?.notifications?.show) {
      await window.electronAPI.notifications.show(title, body);
      return;
    }
    
    // Fallback to browser Notification API (for web/PWA)
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/icon.png' });
        }
      }
    }
  } catch (error) {
    console.error('Failed to show native notification:', error);
  }
};

const notificationService = {
  /**
   * Send app update notification to ALL employees
   * Call this after a new release is pushed
   */
  sendAppUpdateNotification: async (version, releaseNotes = '') => {
    try {
      // Get all employees with user_id (who can receive notifications)
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('user_id')
        .not('user_id', 'is', null);

      if (!allEmployees || allEmployees.length === 0) return;

      const notifications = allEmployees
        .filter(e => e.user_id)
        .map(e => ({
          user_id: e.user_id,
          title: `🚀 Guardian ERP v${version} Released!`,
          message: releaseNotes || 'A new version is available. Please restart the app to update.',
          type: 'system',
          link: '/notifications',
        }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      console.log(`App update notification v${version} sent to ${notifications.length} users`);
      return { success: true, count: notifications.length };
    } catch (error) {
      console.error('Failed to send app update notification:', error);
      throw error;
    }
  },

  /**
   * Send a welcome notification to ALL team members when a new employee is added
   */
  sendWelcomeNotification: async (newEmployee) => {
    try {
      const name = `${newEmployee.first_name || ''} ${newEmployee.last_name || ''}`.trim() || 'New team member';
      const department = newEmployee.department || '';

      // Get all employees with user_id (who can receive notifications)
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('user_id')
        .not('user_id', 'is', null);

      if (!allEmployees || allEmployees.length === 0) return;

      const notifications = allEmployees
        .filter(e => e.user_id) // ensure they have user_id
        .map(e => ({
          user_id: e.user_id,
          title: '🎉 New Team Member!',
          message: `Welcome ${name}${department ? ` to ${department}` : ''} to the team! Say hello!`,
          type: 'welcome',
          link: '/employees',
        }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      console.log(`Welcome notification sent for ${name} to ${notifications.length} users`);
    } catch (error) {
      console.error('Failed to send welcome notification:', error);
    }
  },

  /**
   * Check for birthdays today and send notifications to ALL team members
   * Should be called once per day (on app init, deduplicated)
   */
  checkAndSendBirthdayNotifications: async () => {
    try {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayMMDD = `${month}-${day}`;
      const todayKey = `birthday_check_${today.toISOString().slice(0, 10)}`;

      // Check if we already checked today (prevent duplicates)
      const alreadyChecked = sessionStorage.getItem(todayKey);
      if (alreadyChecked) return;
      sessionStorage.setItem(todayKey, 'true');

      // Get all employees with date_of_birth
      const { data: employees } = await supabase
        .from('employees')
        .select('id, user_id, first_name, last_name, date_of_birth')
        .not('date_of_birth', 'is', null);

      if (!employees || employees.length === 0) return;

      // Find employees whose birthday is today
      const birthdayPeople = employees.filter(emp => {
        if (!emp.date_of_birth) return false;
        const dob = emp.date_of_birth; // "YYYY-MM-DD" string
        const dobMMDD = dob.slice(5); // "MM-DD"
        return dobMMDD === todayMMDD;
      });

      if (birthdayPeople.length === 0) return;

      // Get all employees with user_id for receiving notifications
      const allWithUserId = employees.filter(e => e.user_id);

      // Check which birthday notifications already exist today to avoid duplicates
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const { data: existingNotifs } = await supabase
        .from('notifications')
        .select('message')
        .eq('type', 'birthday')
        .gte('created_at', todayStart);

      const existingMessages = new Set((existingNotifs || []).map(n => n.message));

      for (const bday of birthdayPeople) {
        const name = `${bday.first_name || ''} ${bday.last_name || ''}`.trim();
        const message = `🎂 Today is ${name}'s birthday! Wish them a happy birthday!`;

        // Skip if already sent
        if (existingMessages.has(message)) continue;

        const notifications = allWithUserId
          .filter(e => e.id !== bday.id) // Don't notify the birthday person about their own birthday
          .map(e => ({
            user_id: e.user_id,
            title: '🎂 Birthday Today!',
            message,
            type: 'birthday',
            link: '/employees',
          }));

        // Also send a personal birthday greeting to the birthday person
        if (bday.user_id) {
          notifications.push({
            user_id: bday.user_id,
            title: '🎉 Happy Birthday!',
            message: `Happy Birthday, ${bday.first_name || 'there'}! 🎉 Wishing you a wonderful day!`,
            type: 'birthday',
            link: '/notifications',
          });
        }

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }

        console.log(`Birthday notification sent for ${name} to ${notifications.length} users`);
      }
    } catch (error) {
      console.error('Failed to check birthday notifications:', error);
    }
  },

  /**
   * Subscribe to real-time notifications for a user.
   * Returns a channel that can be unsubscribed.
   * onNotification callback receives the notification object.
   * NOW SHOWS NATIVE DESKTOP POPUPS!
   */
  subscribeToNotifications: (userId, onNotification) => {
    return supabase
      .channel(`user_notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const notification = payload.new;
        
        // Show native notification popup
        if (notification?.title && notification?.message) {
          showNativeNotification(notification.title, notification.message);
        }
        
        // Also call the callback for in-app handling
        if (onNotification) onNotification(notification);
      })
      .subscribe();
  },

  // Expose showNativeNotification for manual use
  showNativeNotification,

  unsubscribe: (channel) => {
    if (channel) supabase.removeChannel(channel);
  },
};

export default notificationService;
