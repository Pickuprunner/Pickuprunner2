import { Platform, PermissionsAndroid } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceApi, DeviceTokenPayload } from '@/apis/device';

const STORED_DEVICE_TOKEN_KEY = '@pickup_runner_registered_device_token';

let activeSyncPromise: Promise<string | null> | null = null;
let inMemorySyncedToken: string | null = null;

function getNotifications(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

export function setupNotificationHandler(): void {
  const N = getNotifications();
  if (N) {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowAlert: true,
      }),
    });

    if (Platform.OS === 'android') {
      setupAndroidChannels();
    }
  }
}

try {
  setupNotificationHandler();
} catch (e) {
}

export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const N = getNotifications();
  if (!N) return;

  try {
    await N.setNotificationChannelAsync('chat', {
      name: 'Chat Messages',
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0066FF',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: N.AndroidNotificationVisibility?.PUBLIC ?? 1,
      bypassDnd: false,
    });

    await N.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0066FF',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: N.AndroidNotificationVisibility?.PUBLIC ?? 1,
      bypassDnd: false,
    });

    await N.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#0066FF',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: N.AndroidNotificationVisibility?.PUBLIC ?? 1,
      bypassDnd: false,
    });

    await N.setNotificationChannelAsync('alerts', {
      name: 'Important Alerts',
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#FF3B30',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: N.AndroidNotificationVisibility?.PUBLIC ?? 1,
      bypassDnd: false,
    });
  } catch (err) {
    console.warn('[notifications] Error setting up Android channels:', err);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const N = getNotifications();
  if (Platform.OS === 'web') return false;

  try {
    if (Platform.OS === 'android') {
      const apiLevel =
        typeof Platform.Version === 'string'
          ? parseInt(Platform.Version, 10)
          : Platform.Version;

      if (apiLevel >= 33) {
        const check = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (!check) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('[notifications] Android POST_NOTIFICATIONS permission not granted:', granted);
            return false;
          }
        }
      }
    }

    if (N) {
      const { status: existing } = await N.getPermissionsAsync();
      if (existing === 'granted') return true;

      const { status } = await N.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: true,
          allowCriticalAlerts: true,
        },
      });
      return status === 'granted';
    }

    return true;
  } catch (err) {
    console.warn('[notifications] Permission request error:', err);
    return false;
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const N = getNotifications();
  if (Platform.OS === 'web') {
    return 'web_push_device_token';
  }
  if (!N) {
    return `emulator_${Platform.OS}_device_token`;
  }

  try {
    await setupAndroidChannels();

    const granted = await requestNotificationPermissions();
    if (!granted) {
      console.log('[notifications] Push notification permission not granted.');
      return null;
    }

    let pushToken: string | null = null;
    try {
      const deviceTokenData = await N.getDevicePushTokenAsync();
      if (deviceTokenData?.data) {
        pushToken =
          typeof deviceTokenData.data === 'string'
            ? deviceTokenData.data
            : JSON.stringify(deviceTokenData.data);
      }
    } catch (deviceTokenErr) {
      console.warn(
        '[notifications] Native FCM/APNs token lookup fallback, trying Expo push token:',
        deviceTokenErr
      );
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const expoTokenData = await N.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        if (expoTokenData?.data) {
          pushToken = expoTokenData.data;
        }
      } catch (expoTokenErr) {
        console.warn('[notifications] Expo push token notice:', expoTokenErr);
      }
    }

    if (!pushToken) {
      const devDeviceType = Device.isDevice ? 'physical' : 'emulator';
      pushToken = `ExpoPushToken[${devDeviceType}_${Platform.OS}_${Device.osBuildId || Device.modelId || 'dev'
        }]`;
    }

    console.log('[notifications] Device Push Token generated:', pushToken);
    return pushToken;
  } catch (err) {
    console.warn('[notifications] Failed to register push token:', err);
    return `ExpoPushToken[emulator_${Platform.OS}_fallback]`;
  }
}

export async function registerAndSyncDeviceToken(userId?: string): Promise<string | null> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        console.log('[notifications] No device token generated or permission denied.');
        return null;
      }

      if (inMemorySyncedToken === token) {
        return token;
      }

      const storageKey = `${STORED_DEVICE_TOKEN_KEY}_${userId || 'guest'}`;
      const cachedToken = await AsyncStorage.getItem(storageKey);

      if (cachedToken === token) {
        inMemorySyncedToken = token;
        return token;
      }

      const platform: 'ios' | 'android' | 'web' =
        Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

      const payload: DeviceTokenPayload = {
        token,
        platform,
        deviceId: Device.modelId || Device.osBuildId || undefined,
        deviceName: Device.deviceName || undefined,
        model: Device.modelName || undefined,
      };

      await AsyncStorage.setItem(storageKey, token);
      inMemorySyncedToken = token;

      console.log('[notifications] Registering device token with backend:', payload);
      await deviceApi.registerDeviceToken(payload);
      console.log('[notifications] Device token successfully registered & synced.');

      return token;
    } catch (err) {
      console.warn('[notifications] Error syncing device token to backend:', err);
      return null;
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

export async function unregisterDeviceToken(userId?: string): Promise<void> {
  try {
    const storageKey = `${STORED_DEVICE_TOKEN_KEY}_${userId || 'guest'}`;
    const token = (await AsyncStorage.getItem(storageKey)) || inMemorySyncedToken;
    if (token) {
      await deviceApi.removeDeviceToken(token).catch(() => {});
      await AsyncStorage.removeItem(storageKey).catch(() => {});
    }
    inMemorySyncedToken = null;
  } catch (err) {
    console.warn('[notifications] Error unregistering device token:', err);
  }
}

export interface InAppNotificationOptions {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  channelId?: 'chat' | 'default' | 'orders' | 'alerts' | string;
}

export async function displayInAppNotification(options: InAppNotificationOptions): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  try {
    const channelId =
      options.channelId ||
      (options.data?.type === 'chat_message' || options.data?.screen === 'chat'
        ? 'chat'
        : options.data?.type === 'new_order' || options.data?.orderId
          ? 'orders'
          : 'default');

    if (Platform.OS === 'android') {
      await setupAndroidChannels();
    }

    const trigger = Platform.OS === 'android' && channelId ? ({ channelId } as any) : null;

    await N.scheduleNotificationAsync({
      content: {
        title: options.title,
        body: options.body,
        data: options.data || {},
        sound: options.sound ?? true,
        priority: 'max',
        vibrate: [0, 250, 250, 250],
        color: '#0066FF',
      },
      trigger,
    });
  } catch (err) {
    console.warn('[notifications] Failed to schedule in-app heads-up notification:', err);
  }
}

export interface NewOrderPayload {
  orderId: string;
  customerName: string;
  deliveryAddress: string;
  items?: string;
}

export async function notifyNewOrder(order: NewOrderPayload): Promise<void> {
  const shortId = order?.orderId ? order.orderId.slice(-6).toUpperCase() : '------';
  await displayInAppNotification({
    title: `New Order #${shortId}`,
    body: `${order.customerName || 'Customer'} · ${order.deliveryAddress || 'Address'}`,
    data: { orderId: order.orderId, type: 'new_order' },
    sound: true,
    channelId: 'orders',
  });
}

export interface ChatMessagePayload {
  senderName: string;
  text: string;
  orderId?: string;
}

export async function notifyChatMessage(msg: ChatMessagePayload): Promise<void> {
  const preview = msg.text.length > 80 ? msg.text.slice(0, 77) + '…' : msg.text;
  const name = msg.senderName ? msg.senderName.trim() : 'New Message';

  await displayInAppNotification({
    title: `${name}`,
    body: preview,
    data: {
      screen: 'chat',
      type: 'chat_message',
      orderId: msg.orderId || '',
    },
    sound: true,
    channelId: 'chat',
  });
}

export function getOrderIdFromNotification(response: any): string | null {
  const content =
    response?.notification?.request?.content ||
    response?.data ||
    response?.notification;
  const data = content?.data || response?.data || {};
  return (data?.orderId as string) || (data?.order_id as string) || null;
}

export function getScreenFromNotification(response: any): string | null {
  const content =
    response?.notification?.request?.content ||
    response?.data ||
    response?.notification;
  const data = content?.data || response?.data || {};

  if (data?.screen) return data.screen as string;
  if (data?.type === 'chat_message') return 'chat';
  if (data?.type === 'new_order' || data?.orderId) return 'order';
  return null;
}
