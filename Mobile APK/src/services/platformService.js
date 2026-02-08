/**
 * Guardian ERP Mobile - Platform Detection & Native Bridge
 * Provides unified API for mobile capabilities with desktop fallbacks
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Toast } from '@capacitor/toast';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Share } from '@capacitor/share';

/**
 * Check if running on native mobile platform
 */
export const isMobile = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if running on specific platform
 */
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isWeb = () => Capacitor.getPlatform() === 'web';

/**
 * Get device info
 */
export const getDeviceInfo = async () => {
  try {
    const info = await Device.getInfo();
    const id = await Device.getId();
    return {
      ...info,
      deviceId: id.identifier,
      isMobile: isMobile(),
      platform: Capacitor.getPlatform(),
    };
  } catch (error) {
    console.warn('[Platform] Could not get device info:', error);
    return {
      platform: 'web',
      isMobile: false,
      deviceId: 'web-' + Math.random().toString(36).substring(7),
    };
  }
};

/**
 * Network status
 */
export const getNetworkStatus = async () => {
  try {
    return await Network.getStatus();
  } catch {
    return { connected: navigator.onLine, connectionType: 'unknown' };
  }
};

export const onNetworkChange = (callback) => {
  if (isMobile()) {
    return Network.addListener('networkStatusChange', callback);
  } else {
    const handler = () => callback({ connected: navigator.onLine });
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    return { remove: () => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
    }};
  }
};

/**
 * Local storage with Preferences (Capacitor) fallback to localStorage
 */
export const storage = {
  get: async (key) => {
    if (isMobile()) {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    }
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },
  set: async (key, value) => {
    const stringValue = JSON.stringify(value);
    if (isMobile()) {
      await Preferences.set({ key, value: stringValue });
    } else {
      localStorage.setItem(key, stringValue);
    }
  },
  remove: async (key) => {
    if (isMobile()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },
  clear: async () => {
    if (isMobile()) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  },
};

/**
 * Notifications
 */
export const notifications = {
  requestPermission: async () => {
    if (isMobile()) {
      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    }
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },
  
  show: async (title, body, data = {}) => {
    if (isMobile()) {
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title,
          body,
          schedule: { at: new Date(Date.now() + 100) },
          extra: data,
          sound: 'default',
          smallIcon: 'ic_stat_icon',
          iconColor: '#0d9488',
        }],
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon-192.png', data });
    }
  },
  
  onReceived: (callback) => {
    if (isMobile()) {
      return LocalNotifications.addListener('localNotificationReceived', callback);
    }
    return { remove: () => {} };
  },
};

/**
 * Haptic feedback
 */
export const haptics = {
  impact: async (style = 'medium') => {
    if (!isMobile()) return;
    const styleMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: styleMap[style] || ImpactStyle.Medium });
  },
  notification: async (type = 'success') => {
    if (!isMobile()) return;
    const typeMap = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
    await Haptics.notification({ type: typeMap[type] || NotificationType.Success });
  },
  vibrate: async () => {
    if (isMobile()) {
      await Haptics.vibrate();
    } else if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  },
};

/**
 * Status bar control (mobile only)
 */
export const statusBar = {
  setDark: async () => {
    if (isMobile()) await StatusBar.setStyle({ style: Style.Dark });
  },
  setLight: async () => {
    if (isMobile()) await StatusBar.setStyle({ style: Style.Light });
  },
  hide: async () => {
    if (isMobile()) await StatusBar.hide();
  },
  show: async () => {
    if (isMobile()) await StatusBar.show();
  },
  setBackgroundColor: async (color) => {
    if (isAndroid()) await StatusBar.setBackgroundColor({ color });
  },
};

/**
 * Keyboard control (mobile only)
 */
export const keyboard = {
  hide: async () => {
    if (isMobile()) await Keyboard.hide();
  },
  show: async () => {
    if (isMobile()) await Keyboard.show();
  },
  onShow: (callback) => {
    if (isMobile()) return Keyboard.addListener('keyboardWillShow', callback);
    return { remove: () => {} };
  },
  onHide: (callback) => {
    if (isMobile()) return Keyboard.addListener('keyboardWillHide', callback);
    return { remove: () => {} };
  },
};

/**
 * Toast messages
 */
export const toast = {
  show: async (text, duration = 'short', position = 'bottom') => {
    if (isMobile()) {
      await Toast.show({ text, duration, position });
    } else {
      // Fallback to console or custom toast
      console.log('[Toast]', text);
    }
  },
};

/**
 * Camera access
 */
export const camera = {
  takePicture: async () => {
    if (isMobile()) {
      return await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
    }
    throw new Error('Camera not available on this platform');
  },
  pickFromGallery: async () => {
    if (isMobile()) {
      return await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });
    }
    throw new Error('Photo gallery not available on this platform');
  },
};

/**
 * Share functionality
 */
export const share = {
  share: async ({ title, text, url, files }) => {
    if (isMobile()) {
      return await Share.share({ title, text, url, files });
    } else if (navigator.share) {
      return await navigator.share({ title, text, url });
    }
    throw new Error('Share not available');
  },
  canShare: async () => {
    if (isMobile()) return true;
    return !!navigator.share;
  },
};

/**
 * App lifecycle events
 */
export const appLifecycle = {
  onResume: (callback) => {
    if (isMobile()) {
      return App.addListener('appStateChange', (state) => {
        if (state.isActive) callback();
      });
    }
    const handler = () => { if (!document.hidden) callback(); };
    document.addEventListener('visibilitychange', handler);
    return { remove: () => document.removeEventListener('visibilitychange', handler) };
  },
  onPause: (callback) => {
    if (isMobile()) {
      return App.addListener('appStateChange', (state) => {
        if (!state.isActive) callback();
      });
    }
    const handler = () => { if (document.hidden) callback(); };
    document.addEventListener('visibilitychange', handler);
    return { remove: () => document.removeEventListener('visibilitychange', handler) };
  },
  onBackButton: (callback) => {
    if (isMobile()) {
      return App.addListener('backButton', callback);
    }
    return { remove: () => {} };
  },
  exitApp: async () => {
    if (isMobile()) await App.exitApp();
  },
};

/**
 * Initialize mobile-specific features
 */
export const initMobile = async () => {
  if (!isMobile()) {
    console.log('[Platform] Running in web mode');
    return;
  }
  
  console.log('[Platform] Initializing mobile features...');
  
  // Set status bar style
  await statusBar.setDark();
  if (isAndroid()) {
    await statusBar.setBackgroundColor('#0f172a');
  }
  
  // Request notification permissions
  await notifications.requestPermission();
  
  // Handle back button (Android)
  if (isAndroid()) {
    let lastBackPress = 0;
    appLifecycle.onBackButton(({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          appLifecycle.exitApp();
        } else {
          lastBackPress = now;
          toast.show('Press back again to exit');
        }
      }
    });
  }
  
  console.log('[Platform] Mobile features initialized');
};

export default {
  isMobile,
  isAndroid,
  isIOS,
  isWeb,
  getDeviceInfo,
  getNetworkStatus,
  onNetworkChange,
  storage,
  notifications,
  haptics,
  statusBar,
  keyboard,
  toast,
  camera,
  share,
  appLifecycle,
  initMobile,
};
