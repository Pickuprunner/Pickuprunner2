/**
 * lib/notifications.ts
 *
 * Local push notifications for drivers.
 * - iOS/Android: uses expo-notifications to schedule a system notification
 * - Web: not supported natively; the caller should fall back to an in-app banner
 */
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGoAndroid =
  Platform.OS === 'android' &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazily load expo-notifications only on native (excluding Expo Go on Android where remote notifications were removed in SDK 53)
function getNotifications(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'web' || isExpoGoAndroid) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch {
    return null;
  }
}

/**
 * Configure how notifications appear when the app is in the foreground.
 * Call this once after the app mounts (not at module level).
 */
export function setupNotificationHandler(): void {
  const N = getNotifications();
  if (!N) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/** Request notification permissions. Call once at app startup. */
export async function requestNotificationPermissions(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  try {
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export interface NewOrderPayload {
  orderId: string;
  customerName: string;
  deliveryAddress: string;
  items: string;
}

/** Fire a local push notification when a new order arrives. */
export async function notifyNewOrder(order: NewOrderPayload): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  try {
    const shortId = order?.orderId ? order.orderId.slice(-6).toUpperCase() : '------';
    await N.scheduleNotificationAsync({
      content: {
        title: `🛍️ New Order #${shortId}`,
        body: `${order.customerName} · ${order.deliveryAddress}`,
        data: { orderId: order.orderId },
        sound: true,
      },
      trigger: null, // fire immediately
    });
  } catch (err) {
    console.warn('[notifications] Failed to schedule notification:', err);
  }
}

/** Returns the order id from a notification response, if present. */
export function getOrderIdFromNotification(response: any): string | null {
  return (response?.notification?.request?.content?.data?.orderId as string) ?? null;
}

export interface ChatMessagePayload {
  senderName: string;
  text: string;
}

/** Fire a local push notification when a chat message arrives from another driver. */
export async function notifyChatMessage(msg: ChatMessagePayload): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  try {
    const preview = msg.text.length > 80 ? msg.text.slice(0, 77) + '…' : msg.text;
    await N.scheduleNotificationAsync({
      content: {
        title: `💬 ${msg.senderName}`,
        body: preview,
        data: { screen: 'chat' },
        sound: true,
      },
      trigger: null, // fire immediately
    });
  } catch (err) {
    console.warn('[notifications] Failed to schedule chat notification:', err);
  }
}

/** Returns the deep-link screen from a notification response, if present. */
export function getScreenFromNotification(response: any): string | null {
  return (response?.notification?.request?.content?.data?.screen as string) ?? null;
}
