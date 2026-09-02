import { apiClient } from '@/lib/apiClient';

export interface DeviceTokenPayload {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
  deviceName?: string;
  model?: string;
}

export interface RegisterDeviceResponse {
  success: boolean;
  data?: {
    device?: {
      id?: string;
      userId?: string;
      token: string;
      platform: string;
      lastSeenAt?: string;
      createdAt?: string;
      updatedAt?: string;
    };
    pushConfigured?: boolean;
  };
  message?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface NotificationsListResponse {
  success?: boolean;
  data: {
    notifications: NotificationItem[];
    unreadCount?: number;
  };
}

export const deviceApi = {

  registerDeviceToken: (payload: DeviceTokenPayload): Promise<RegisterDeviceResponse> => {
    return apiClient.post<RegisterDeviceResponse>('/devices', payload);
  },


  removeDeviceToken: (token: string): Promise<{ success: boolean; message?: string }> => {
    return apiClient.del<{ success: boolean; message?: string }>('/devices', { token });
  },


  getDevices: async (): Promise<RegisterDeviceResponse[]> => {
    const res = await apiClient.get<{ data: RegisterDeviceResponse[] }>('/devices');
    return res.data || [];
  },
};

export const notificationApi = {
  getNotifications: (params?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<NotificationsListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) searchParams.append('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.append('offset', String(params.offset));
    if (params?.unreadOnly !== undefined) searchParams.append('unreadOnly', String(params.unreadOnly));
    const qs = searchParams.toString();
    return apiClient.get<NotificationsListResponse>(qs ? `/notifications?${qs}` : '/notifications');
  },

  markAsRead: (notificationId: string): Promise<{ success: boolean; data?: { markedRead: number; unread: number } }> => {
    return apiClient.post<{ success: boolean; data?: { markedRead: number; unread: number } }>('/notifications/read', {
      ids: [notificationId],
    });
  },

};
