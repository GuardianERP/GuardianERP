/**
 * Guardian Desktop ERP - Notification Service
 * Handles auto-notifications: welcome (new employee), birthday, chat
 * Meeting/Task/Reminder notifications at 30min, 20min, 5min, 1min before
 */

import { supabase } from './supabaseClient';
import soundService from './soundService';

// Check if we're in Electron environment
const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Store notification timers
const notificationTimers = new Map();

// Standalone function for showing native notifications (used throughout the service)
function showNativeNotification(title, message, options = {}) {
  // Play notification sound
  try { soundService.playMessageNotification(); } catch (e) { /* ignore audio errors */ }

  // Try Electron notification first
  if (isElectron && window.electronAPI?.notifications?.show) {
    window.electronAPI.notifications.show(title, message, null);
    return;
  }
  // Fallback to Web Notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body: message, icon: '/icon.png', ...options });
    } catch (e) {
      console.warn('[NotificationService] Web notification failed:', e);
    }
  }
}

const notificationService = {
  /**
   * Show system tray notification (works in Electron)
   */
  showSystemNotification: (title, message, options = {}) => {
    console.log('[NotificationService] Showing notification:', { title, message, isElectron });
    
    // Try Electron notification first
    if (isElectron && window.electronAPI?.notifications?.show) {
      console.log('[NotificationService] Using Electron notifications');
      window.electronAPI.notifications.show(title, message, null);
      return;
    }
    
    // Fallback to Web Notification API
    if ('Notification' in window) {
      console.log('[NotificationService] Using Web Notification API, permission:', Notification.permission);
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/logo-brand.png',
          tag: options.tag || 'guardian-erp',
          requireInteraction: options.urgent || false,
          ...options
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          console.log('[NotificationService] Permission after request:', permission);
          if (permission === 'granted') {
            new Notification(title, {
              body: message,
              icon: '/logo-brand.png',
              ...options
            });
          }
        });
      } else {
        console.warn('[NotificationService] Notifications are denied by user');
      }
    } else {
      console.warn('[NotificationService] Notification API not available');
    }
  },

  /**
   * Request notification permission
   */
  requestPermission: async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('[NotificationService] Permission result:', permission);
      return permission;
    }
    console.log('[NotificationService] Current permission:', Notification.permission);
    return Notification.permission;
  },
  
  /**
   * Test notification - call this to verify notifications are working
   */
  testNotification: () => {
    console.log('[NotificationService] Testing notification...');
    console.log('[NotificationService] isElectron:', isElectron);
    console.log('[NotificationService] Notification API available:', 'Notification' in window);
    console.log('[NotificationService] Permission:', 'Notification' in window ? Notification.permission : 'N/A');
    
    notificationService.showSystemNotification(
      'ðŸ”” Test Notification',
      'Guardian ERP notifications are working! You will receive alerts for meetings, tasks, and reminders.',
      { urgent: false }
    );
    
    return {
      isElectron,
      notificationAPIAvailable: 'Notification' in window,
      permission: 'Notification' in window ? Notification.permission : 'N/A'
    };
  },

  /**
   * Schedule reminder notifications for a meeting
   * Sends at 30min, 20min, 5min, and 1min before
   */
  scheduleMeetingReminders: (meeting, onOverlayNotification) => {
    const meetingTime = new Date(meeting.start_time);
    const now = new Date();
    const timerId = `meeting_${meeting.id}`;
    
    // Clear any existing timers for this meeting
    notificationService.clearScheduledNotifications(timerId);
    
    const intervals = [
      { minutes: 30, label: '30 minutes' },
      { minutes: 20, label: '20 minutes' },
      { minutes: 5, label: '5 minutes' },
      { minutes: 1, label: '1 minute' }
    ];
    
    const timers = [];
    
    intervals.forEach(({ minutes, label }) => {
      const notifyTime = new Date(meetingTime.getTime() - minutes * 60 * 1000);
      const delay = notifyTime.getTime() - now.getTime();
      
      if (delay > 0) {
        const timer = setTimeout(() => {
          const title = `ðŸ“… Meeting in ${label}`;
          const message = `"${meeting.title}" starts in ${label}`;
          
          // System tray notification
          notificationService.showSystemNotification(title, message, { urgent: minutes <= 5 });
          
          // Overlay notification callback
          if (onOverlayNotification) {
            onOverlayNotification({
              type: 'meeting',
              title,
              message,
              meetingId: meeting.id,
              urgent: minutes <= 5
            });
          }
        }, delay);
        
        timers.push(timer);
      }
    });
    
    notificationTimers.set(timerId, timers);
  },

  /**
   * Schedule reminder notifications for a task
   */
  scheduleTaskReminders: (task, onOverlayNotification) => {
    if (!task.due_date) return;
    
    const dueTime = new Date(task.due_date);
    const now = new Date();
    const timerId = `task_${task.id}`;
    
    notificationService.clearScheduledNotifications(timerId);
    
    const intervals = [
      { minutes: 30, label: '30 minutes' },
      { minutes: 20, label: '20 minutes' },
      { minutes: 5, label: '5 minutes' },
      { minutes: 1, label: '1 minute' }
    ];
    
    const timers = [];
    
    intervals.forEach(({ minutes, label }) => {
      const notifyTime = new Date(dueTime.getTime() - minutes * 60 * 1000);
      const delay = notifyTime.getTime() - now.getTime();
      
      if (delay > 0) {
        const timer = setTimeout(() => {
          const title = `ðŸ“‹ Task due in ${label}`;
          const message = `"${task.title}" is due in ${label}`;
          
          notificationService.showSystemNotification(title, message, { urgent: minutes <= 5 });
          
          if (onOverlayNotification) {
            onOverlayNotification({
              type: 'task',
              title,
              message,
              taskId: task.id,
              urgent: minutes <= 5
            });
          }
        }, delay);
        
        timers.push(timer);
      }
    });
    
    notificationTimers.set(timerId, timers);
  },

  /**
   * Schedule personal reminder notifications
   */
  schedulePersonalReminder: (reminder, onOverlayNotification) => {
    if (!reminder.reminder_time) return;
    
    const reminderTime = new Date(reminder.reminder_time);
    const now = new Date();
    const timerId = `reminder_${reminder.id}`;
    
    notificationService.clearScheduledNotifications(timerId);
    
    const intervals = [
      { minutes: 30, label: '30 minutes' },
      { minutes: 20, label: '20 minutes' },
      { minutes: 5, label: '5 minutes' },
      { minutes: 1, label: '1 minute' },
      { minutes: 0, label: 'now' }
    ];
    
    const timers = [];
    
    intervals.forEach(({ minutes, label }) => {
      const notifyTime = new Date(reminderTime.getTime() - minutes * 60 * 1000);
      const delay = notifyTime.getTime() - now.getTime();
      
      if (delay > 0) {
        const timer = setTimeout(() => {
          const title = minutes === 0 ? `ðŸ”” Reminder: ${reminder.title}` : `ðŸ”” Reminder in ${label}`;
          const message = minutes === 0 
            ? reminder.description || reminder.title
            : `"${reminder.title}" reminder in ${label}`;
          
          notificationService.showSystemNotification(title, message, { 
            urgent: minutes <= 5,
            requireInteraction: minutes === 0
          });
          
          if (onOverlayNotification) {
            onOverlayNotification({
              type: 'reminder',
              title,
              message,
              reminderId: reminder.id,
              urgent: minutes <= 5
            });
          }
        }, delay);
        
        timers.push(timer);
      }
    });
    
    notificationTimers.set(timerId, timers);
  },

  /**
   * Clear scheduled notifications for a specific item
   */
  clearScheduledNotifications: (timerId) => {
    const timers = notificationTimers.get(timerId);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
      notificationTimers.delete(timerId);
    }
  },

  /**
   * Clear all scheduled notifications
   */
  clearAllScheduledNotifications: () => {
    notificationTimers.forEach((timers) => {
      timers.forEach(timer => clearTimeout(timer));
    });
    notificationTimers.clear();
  },

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
          title: `ðŸš€ Guardian ERP v${version} Released!`,
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
          title: 'ðŸŽ‰ New Team Member!',
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
        const message = `ðŸŽ‚ Today is ${name}'s birthday! Wish them a happy birthday!`;

        // Skip if already sent
        if (existingMessages.has(message)) continue;

        const notifications = allWithUserId
          .filter(e => e.id !== bday.id) // Don't notify the birthday person about their own birthday
          .map(e => ({
            user_id: e.user_id,
            title: 'ðŸŽ‚ Birthday Today!',
            message,
            type: 'birthday',
            link: '/employees',
          }));

        // Also send a personal birthday greeting to the birthday person
        if (bday.user_id) {
          notifications.push({
            user_id: bday.user_id,
            title: 'ðŸŽ‰ Happy Birthday!',
            message: `Happy Birthday, ${bday.first_name || 'there'}! ðŸŽ‰ Wishing you a wonderful day!`,
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
   * Check for employee work milestones and send notifications
   * Milestones: 100, 200, 300 days and 3, 6, 12, 24 months
   * Should be called once per day (on app init, deduplicated)
   */
  checkAndSendMilestoneNotifications: async () => {
    try {
      const today = new Date();
      const todayKey = `milestone_check_${today.toISOString().slice(0, 10)}`;

      // Check if we already checked today
      if (sessionStorage.getItem(todayKey)) return;
      sessionStorage.setItem(todayKey, 'true');

      // Get all employees with joining_date
      const { data: employees } = await supabase
        .from('employees')
        .select('id, user_id, first_name, last_name, joining_date')
        .not('joining_date', 'is', null);

      if (!employees || employees.length === 0) return;

      // Get all employees with user_id for receiving notifications
      const allWithUserId = employees.filter(e => e.user_id);

      // Check which milestone notifications already exist today
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const { data: existingNotifs } = await supabase
        .from('notifications')
        .select('message')
        .eq('type', 'info')
        .gte('created_at', todayStart)
        .like('title', '%Milestone%');

      const existingMessages = new Set((existingNotifs || []).map(n => n.message));

      // Day milestones
      const dayMilestones = [100, 200, 300];
      // Month milestones (in days, approximate)
      const monthMilestones = [
        { months: 3, days: 91, label: '3 months' },
        { months: 6, days: 182, label: '6 months' },
        { months: 12, days: 365, label: '1 year' },
        { months: 24, days: 730, label: '2 years' },
      ];

      for (const emp of employees) {
        if (!emp.joining_date) continue;

        const joinDate = new Date(emp.joining_date);
        const diffMs = today.getTime() - joinDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();

        // Check day milestones
        for (const milestone of dayMilestones) {
          if (diffDays === milestone) {
            const message = `${name} has completed ${milestone} days at Guardian! Congratulations!`;
            if (existingMessages.has(message)) continue;

            const notifications = allWithUserId.map(e => ({
              user_id: e.user_id,
              title: `\u{1F3C6} ${milestone}-Day Milestone!`,
              message,
              type: 'info',
              link: '/employees',
            }));

            if (notifications.length > 0) {
              await supabase.from('notifications').insert(notifications);
            }
            console.log(`Milestone notification: ${name} - ${milestone} days`);
          }
        }

        // Check month milestones
        for (const { days, label } of monthMilestones) {
          if (diffDays === days) {
            const message = `${name} has completed ${label} at Guardian! Congratulations!`;
            if (existingMessages.has(message)) continue;

            const notifications = allWithUserId.map(e => ({
              user_id: e.user_id,
              title: `\u{1F31F} ${label} Milestone!`,
              message,
              type: 'info',
              link: '/employees',
            }));

            if (notifications.length > 0) {
              await supabase.from('notifications').insert(notifications);
            }
            console.log(`Milestone notification: ${name} - ${label}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check milestone notifications:', error);
    }
  },

  /**
   * Send admin announcement to all employees
   * Only admins can send announcements
   */
  sendAdminAnnouncement: async (title, message, urgent = false) => {
    try {
      // Get all employees with user_id
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('user_id')
        .not('user_id', 'is', null);

      if (!allEmployees || allEmployees.length === 0) return { success: false, error: 'No employees found' };

      const notifications = allEmployees
        .filter(e => e.user_id)
        .map(e => ({
          user_id: e.user_id,
          title: `\u{1F4E2} ${title}`,
          message,
          type: 'alert',
          link: '/notifications',
        }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      // Also show native notification if urgent
      if (urgent) {
        showNativeNotification(`\u{1F4E2} ${title}`, message);
      }

      console.log(`Admin announcement sent to ${notifications.length} users: ${title}`);
      return { success: true, count: notifications.length };
    } catch (error) {
      console.error('Failed to send admin announcement:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send leave status notification to employee
   */
  sendLeaveStatusNotification: async (employeeUserId, status, leaveType, approverName) => {
    try {
      if (!employeeUserId) return;

      const statusMessages = {
        recommended: `Your ${leaveType} leave has been recommended by ${approverName} and forwarded to CEO for final approval.`,
        approved: `Your ${leaveType} leave has been approved by ${approverName}!`,
        rejected: `Your ${leaveType} leave has been rejected by ${approverName}.`,
      };

      const notification = {
        user_id: employeeUserId,
        title: status === 'approved' ? '\u{2705} Leave Approved' : status === 'rejected' ? '\u{274C} Leave Rejected' : '\u{1F4CB} Leave Recommended',
        message: statusMessages[status] || `Your leave request status has been updated to: ${status}`,
        type: status === 'approved' ? 'success' : status === 'rejected' ? 'alert' : 'info',
        link: '/leaves',
      };

      await supabase.from('notifications').insert(notification);
      showNativeNotification(notification.title, notification.message);
    } catch (error) {
      console.error('Failed to send leave status notification:', error);
    }
  },

  /**
   * Send loan status notification to employee
   */
  sendLoanStatusNotification: async (employeeUserId, status, amount, approverName) => {
    try {
      if (!employeeUserId) return;

      const statusMessages = {
        recommended: `Your loan request of $${amount} has been recommended by ${approverName} and forwarded for final approval.`,
        approved: `Your loan request of $${amount} has been approved by ${approverName}!`,
        rejected: `Your loan request of $${amount} has been rejected by ${approverName}.`,
        disbursed: `Your loan of $${amount} has been disbursed!`,
      };

      const notification = {
        user_id: employeeUserId,
        title: status === 'approved' ? '\u{2705} Loan Approved' : status === 'rejected' ? '\u{274C} Loan Rejected' : '\u{1F4B0} Loan Update',
        message: statusMessages[status] || `Your loan request status has been updated to: ${status}`,
        type: status === 'approved' || status === 'disbursed' ? 'success' : status === 'rejected' ? 'alert' : 'info',
        link: '/loans',
      };

      await supabase.from('notifications').insert(notification);
      showNativeNotification(notification.title, notification.message);
    } catch (error) {
      console.error('Failed to send loan status notification:', error);
    }
  },

  /**
   * Send task due notification to assigned employee
   * Called when a task is approaching its due date
   */
  sendTaskDueNotification: async (task, employee) => {
    try {
      if (!employee?.user_id) return;

      const notification = {
        user_id: employee.user_id,
        title: 'â° Task Due Soon',
        message: `Task "${task.title}" is due ${task.due_date ? `on ${new Date(task.due_date).toLocaleDateString()}` : 'soon'}!`,
        type: 'task',
        link: '/tasks',
      };

      await supabase.from('notifications').insert(notification);
      
      // Also show native notification immediately
      showNativeNotification(notification.title, notification.message);

      console.log('Task due notification sent for:', task.title);
    } catch (error) {
      console.error('Failed to send task due notification:', error);
    }
  },

  /**
   * Send meeting reminder notification to all participants
   * Called before a meeting starts (e.g., 15 mins before)
   */
  sendMeetingReminderNotification: async (meeting, participants) => {
    try {
      if (!participants || participants.length === 0) return;

      const startTime = new Date(meeting.start_time);
      const timeString = startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const notifications = participants
        .filter(p => p.user_id)
        .map(p => ({
          user_id: p.user_id,
          title: 'ðŸ“… Meeting Starting Soon',
          message: `"${meeting.title}" starts at ${timeString}. Click to join!`,
          type: 'meeting',
          link: '/meetings',
        }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
        
        // Show native notification to organizer
        showNativeNotification('ðŸ“… Meeting Starting Soon', `"${meeting.title}" starts at ${timeString}`);
      }

      console.log(`Meeting reminder sent for ${meeting.title} to ${notifications.length} participants`);
    } catch (error) {
      console.error('Failed to send meeting reminder:', error);
    }
  },

  /**
   * Send meeting invitation notification to a participant
   */
  sendMeetingInviteNotification: async (meeting, participant) => {
    try {
      if (!participant?.user_id) return;

      const startTime = new Date(meeting.start_time);
      const dateString = startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeString = startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const notification = {
        user_id: participant.user_id,
        title: 'ðŸ“§ Meeting Invitation',
        message: `You've been invited to "${meeting.title}" on ${dateString} at ${timeString}`,
        type: 'meeting',
        link: '/meetings',
      };

      await supabase.from('notifications').insert(notification);
      showNativeNotification(notification.title, notification.message);

      console.log('Meeting invite notification sent to:', participant.user_id);
    } catch (error) {
      console.error('Failed to send meeting invite notification:', error);
    }
  },

  /**
   * Check for upcoming meetings and send reminders
   * Should be called periodically (e.g., every 5 minutes)
   */
  checkUpcomingMeetingReminders: async (userId) => {
    try {
      const now = new Date();
      const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60 * 1000);
      const tenMinsFromNow = new Date(now.getTime() + 10 * 60 * 1000);

      // Check if we already sent a reminder in this window
      const reminderKey = `meeting_reminder_check_${now.toISOString().slice(0, 16)}`; // Per minute
      if (sessionStorage.getItem(reminderKey)) return;
      sessionStorage.setItem(reminderKey, 'true');

      // Get meetings starting in 10-15 minutes
      const { data: meetings } = await supabase
        .from('meetings')
        .select('*')
        .eq('status', 'scheduled')
        .gte('start_time', tenMinsFromNow.toISOString())
        .lte('start_time', fifteenMinsFromNow.toISOString());

      if (!meetings || meetings.length === 0) return;

      for (const meeting of meetings) {
        // Check if user is a participant or organizer
        const participants = meeting.participants || [];
        const isParticipant = meeting.organizer_id === userId || 
          participants.some(p => p.user_id === userId);

        if (isParticipant) {
          const startTime = new Date(meeting.start_time);
          showNativeNotification(
            'ðŸ“… Meeting in 15 minutes',
            `"${meeting.title}" starts at ${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
          );
        }
      }
    } catch (error) {
      console.error('Failed to check upcoming meeting reminders:', error);
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
        
        // Show native desktop notification popup
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

  /**
   * Initialize notifications for all upcoming meetings, tasks, and reminders
   * Call this on app start or when user logs in
   */
  initializeUpcomingNotifications: async (userId, onOverlayNotification) => {
    const now = new Date();
    const thirtyMinFromNow = new Date(now.getTime() + 35 * 60 * 1000); // 35 min to catch 30 min reminders
    
    try {
      // Get upcoming meetings (within next 35 minutes)
      const { data: meetings } = await supabase
        .from('meetings')
        .select('*')
        .gte('start_time', now.toISOString())
        .lte('start_time', thirtyMinFromNow.toISOString())
        .order('start_time', { ascending: true });

      if (meetings) {
        meetings.forEach(meeting => {
          notificationService.scheduleMeetingReminders(meeting, onOverlayNotification);
        });
        console.log(`Scheduled notifications for ${meetings.length} upcoming meetings`);
      }

      // Get upcoming tasks with due dates (within next 35 minutes)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId)
        .neq('status', 'completed')
        .gte('due_date', now.toISOString())
        .lte('due_date', thirtyMinFromNow.toISOString())
        .order('due_date', { ascending: true });

      if (tasks) {
        tasks.forEach(task => {
          notificationService.scheduleTaskReminders(task, onOverlayNotification);
        });
        console.log(`Scheduled notifications for ${tasks.length} upcoming tasks`);
      }

      // Get upcoming personal reminders (within next 35 minutes)
      const { data: reminders } = await supabase
        .from('personal_reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .gte('reminder_time', now.toISOString())
        .lte('reminder_time', thirtyMinFromNow.toISOString())
        .order('reminder_time', { ascending: true });

      if (reminders) {
        reminders.forEach(reminder => {
          notificationService.schedulePersonalReminder(reminder, onOverlayNotification);
        });
        console.log(`Scheduled notifications for ${reminders.length} upcoming reminders`);
      }

      return { meetings: meetings?.length || 0, tasks: tasks?.length || 0, reminders: reminders?.length || 0 };
    } catch (error) {
      console.error('Failed to initialize upcoming notifications:', error);
      return { meetings: 0, tasks: 0, reminders: 0 };
    }
  },

  /**
   * Start polling for upcoming items every minute
   * Returns a function to stop polling
   */
  startNotificationPolling: (userId, onOverlayNotification) => {
    // Initial load
    notificationService.initializeUpcomingNotifications(userId, onOverlayNotification);
    
    // Poll every minute
    const pollInterval = setInterval(() => {
      notificationService.initializeUpcomingNotifications(userId, onOverlayNotification);
    }, 60 * 1000);
    
    // Return cleanup function
    return () => {
      clearInterval(pollInterval);
      notificationService.clearAllScheduledNotifications();
    };
  },
};

export default notificationService;
