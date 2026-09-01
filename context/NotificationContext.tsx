import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { notificationApi, NotificationItem } from '@/apis/device';
import {
  setupNotificationHandler,
  setupAndroidChannels,
  requestNotificationPermissions,
  registerAndSyncDeviceToken,
  displayInAppNotification,
  InAppNotificationOptions,
  getOrderIdFromNotification,
  getScreenFromNotification,
} from '@/lib/notifications';

function getNotifications(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

export interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  requestUserPermission: () => Promise<boolean>;
  displayNotification: (options: InAppNotificationOptions) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const response = await notificationApi.getNotifications({ limit: 40 });
      if (response && response.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount ?? 0);
      }
    } catch (error) {
      console.warn('[NotificationContext] Fetch notifications error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const requestUserPermission = useCallback(async () => {
    try {
      const granted = await requestNotificationPermissions();
      if (granted && userId) {
        await registerAndSyncDeviceToken(userId);
      }
      return granted;
    } catch (error) {
      console.warn('[NotificationContext] Permission request error:', error);
      return false;
    }
  }, [userId]);

  useEffect(() => {
    setupNotificationHandler();
    if (Platform.OS === 'android') {
      setupAndroidChannels();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      requestUserPermission();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, userId, requestUserPermission]);

  const handleNotificationTap = useCallback((response: any) => {
    console.log('[NotificationContext] Notification tapped:', response);
    const orderId = getOrderIdFromNotification(response);
    const screen = getScreenFromNotification(response);
    const role = useAuthStore.getState().user?.role || 'customer';

    if (
      screen === 'chat' ||
      response?.notification?.request?.content?.data?.type === 'chat_message' ||
      response?.data?.type === 'chat_message'
    ) {
      if (role === 'driver') {
        router.push(orderId ? `/(tabs)/chat?orderId=${orderId}` : '/(tabs)/chat');
      } else {
        router.push(orderId ? `/(customer)/chat?orderId=${orderId}` : '/(customer)/chat');
      }
      return;
    }

    if (orderId) {
      if (role === 'driver') {
        router.push(`/order/${orderId}`);
      } else {
        router.push(`/(customer)/track/${orderId}`);
      }
      return;
    }

    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const N = getNotifications();
    if (!N) return;

    const receivedSubscription = N.addNotificationReceivedListener((notification) => {
      console.log('[NotificationContext] Foreground notification received:', notification);
      fetchNotifications();
    });

    const responseSubscription = N.addNotificationResponseReceivedListener((response) => {
      handleNotificationTap(response);
    });

    N.getLastNotificationResponseAsync().then((initialResponse) => {
      if (initialResponse) {
        setTimeout(() => {
          handleNotificationTap(initialResponse);
        }, 500);
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [handleNotificationTap, fetchNotifications]);


  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await fetchNotifications();
    } catch (error) {
      console.warn('[NotificationContext] Mark as read error:', error);
    }
  }, [fetchNotifications]);

  const displayNotification = useCallback(async (options: InAppNotificationOptions) => {
    await displayInAppNotification(options);
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        requestUserPermission,
        displayNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
