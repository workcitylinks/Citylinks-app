import { Platform } from 'react-native';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/apiClient';

// Safely obtain expo-notifications
function loadNotificationsModule(): any {
  try {
    return require('expo-notifications');
  } catch (err: any) {
    console.warn('[PushNotifications] expo-notifications load warning:', err?.message || err);
    return null;
  }
}

const Notifications = loadNotificationsModule();

// If Notifications module is available in this environment, configure foreground behavior
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority?.MAX,
      }),
    });
  } catch (err) {
    console.warn('[PushNotifications] Failed to set notification handler:', err);
  }
}

/**
 * Ensures high-priority notification channels are created on Android
 */
export async function ensureNotificationChannels(): Promise<void> {
  if (!Notifications || Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync('citylinks_alerts', {
      name: 'CityLinks Alerts & Stores',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('citylinks_rides', {
      name: 'Ride Tracking & Drivers',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#16a34a',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  } catch (chErr) {
    console.log('[Push] Channel setup note:', chErr);
  }
}

/**
 * Triggers an immediate native system notification on the mobile device
 * (Appears in Android status bar, top drop-down drawer, and lock screen with sound and vibration)
 */
export async function triggerLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> {
  if (!Notifications) {
    console.log('[Push] Local notification module not available:', title);
    return;
  }

  try {
    await ensureNotificationChannels();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        channelId: (data.type || '').includes('ride') ? 'citylinks_rides' : 'citylinks_alerts',
        priority: Notifications.AndroidNotificationPriority?.MAX,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // null means show immediately!
    });
    console.log('🔔 [Push] Native system notification triggered:', title);
  } catch (err: any) {
    console.warn('[Push] Error scheduling local notification:', err?.message || err);
  }
}

/**
 * Registers this device with Firebase Cloud Messaging (FCM) or local gateway,
 * configures Android high-priority notification channels,
 * and saves the device push token to the CityLinks backend.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Notifications) {
    console.log('[Push] Notifications module not available.');
    return null;
  }

  let token: string | null = null;

  try {
    // 1. Setup Android high-priority notification channels
    await ensureNotificationChannels();

    // 2. Request notification permissions from user
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ [Push] Notification permission not granted by user.');
      return null;
    }

    // 3. Try to get native FCM token (supported in standalone APK / dev builds with google-services.json)
    try {
      const deviceTokenRes = await Notifications.getDevicePushTokenAsync();
      if (deviceTokenRes?.data && typeof deviceTokenRes.data === 'string') {
        token = deviceTokenRes.data;
        console.log('✅ [Push] Native FCM Device Token acquired:', token);
      }
    } catch (fcmErr: any) {
      console.log('[Push] Native FCM note (stand-alone/dev build required for raw FCM):', fcmErr?.message || fcmErr);
    }

    // 4. Try Expo Push Token if EAS configured
    if (!token) {
      try {
        const expoTokenRes = await Notifications.getExpoPushTokenAsync();
        if (expoTokenRes?.data) {
          token = expoTokenRes.data;
          console.log('✅ [Push] Expo Push Token acquired:', token);
        }
      } catch (expoErr: any) {
        // Expected when running Expo Go without EAS projectId
      }
    }

    // 5. Fallback: Generate a persistent device token for this installation
    if (!token) {
      try {
        let storedId = await AsyncStorage.getItem('citylinks_installation_token');
        if (!storedId) {
          storedId = 'device_expo_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
          await AsyncStorage.setItem('citylinks_installation_token', storedId);
        }
        token = storedId;
        console.log('📱 [Push] Registered local device identifier:', token);
      } catch (idErr) {}
    }

    // 6. Sync token to CityLinks backend
    if (token) {
      await syncTokenWithBackend(token);
    }
  } catch (error) {
    console.error('[Push] Error registering for push notifications:', error);
  }

  return token;
}

/**
 * Sends device token to backend /api/notifications/register-token
 */
export async function syncTokenWithBackend(token: string) {
  try {
    await apiClient.post('/notifications/register-token', {
      token,
      platform: Platform.OS,
    });
    console.log('🚀 [Push] Device token registered with CityLinks backend:', token.slice(0, 25) + '...');
  } catch (error: any) {
    console.log('[Push] Token register response:', error?.response?.data || error?.message);
  }
}

/**
 * Unregisters device token on logout
 */
export async function unregisterTokenFromBackend(token: string) {
  try {
    const storedToken = await AsyncStorage.getItem('citylinks_installation_token');
    if (storedToken) {
      await apiClient.post('/notifications/unregister-token', { token: storedToken });
    }
  } catch (error: any) {
    console.log('[Push] Token unregister error:', error?.message);
  }
}

/**
 * Sets up tap listeners to direct user to the appropriate screen when they tap a push notification
 */
export function setupPushNotificationListeners(router: any) {
  if (!Notifications) {
    return () => {};
  }

  try {
    // 1. Foreground listener (notification arrived while app is running)
    const notificationListener = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('🔔 [Push] Foreground notification received:', notification?.request?.content?.title);
    });

    // 2. Response listener (user tapped on the mobile notification banner)
    const responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
      try {
        const data = response?.notification?.request?.content?.data || {};
        console.log('👉 [Push] User tapped notification with data:', data);

        if (data.route && typeof data.route === 'string') {
          router.push(data.route);
          return;
        }

        const type = String(data.type || '').toLowerCase();
        if (type.includes('ride_request') || type.includes('driver')) {
          router.push('/transport-dashboard');
        } else if (type.includes('ride') || type.includes('passenger') || type.includes('transport')) {
          router.push('/book-transport');
        } else if (type.includes('order')) {
          router.push('/orders');
        } else {
          router.push('/notifications');
        }
      } catch (e) {
        console.error('[Push] Error handling notification tap:', e);
      }
    });

    return () => {
      try {
        notificationListener.remove();
        responseListener.remove();
      } catch (e) {}
    };
  } catch (e) {
    return () => {};
  }
}
