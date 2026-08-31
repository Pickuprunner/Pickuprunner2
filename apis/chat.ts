import { apiClient } from '@/lib/apiClient';

export interface ApiLastMessage {
  body: string;
  kind?: string;
  senderRole?: 'driver' | 'customer' | 'admin' | 'system';
  mine?: boolean;
  createdAt: string;
}

export interface ApiChatSummary {
  orderId: string;
  orderStatus: string;
  open: boolean;
  awaitingDriver: boolean;
  role: 'driver' | 'customer' | 'admin';
  counterpartyName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  unread: number;
  lastMessage?: ApiLastMessage | null;
  createdAt: string;
}

export interface GetChatsResponse {
  total: number;
  limit: number;
  offset: number;
  includeClosed: boolean;
  totalUnread: number;
  chats: ApiChatSummary[];
}

export interface ApiChatMessage {
  id: string;
  orderId: string;
  senderId?: string;
  senderRole?: 'driver' | 'customer' | 'admin' | 'system';
  kind?: string;
  body: string;
  mine?: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface GetMessagesResponse {
  orderId: string;
  chat?: {
    open: boolean;
    orderStatus: string;
    closedReason?: string | null;
    awaitingDriver?: boolean;
  };
  role?: string;
  unread: number;
  limit?: number;
  cursor?: string | null;
  oldestCursor?: string | null;
  hasOlder?: boolean;
  hasNewer?: boolean;
  messages: ApiChatMessage[];
}

export interface SendMessagePayload {
  body: string;
  text?: string;
  role?: string;
}

export const chatApi = {
  getChats: async (params?: {
    limit?: number;
    offset?: number;
    includeClosed?: boolean;
  }): Promise<GetChatsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) searchParams.append('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.append('offset', String(params.offset));
    if (params?.includeClosed !== undefined) searchParams.append('includeClosed', String(params.includeClosed));

    const qs = searchParams.toString();
    const endpoint = qs ? `/chats?${qs}` : '/chats';
    const res = await apiClient.get<any>(endpoint);
    const data = res?.data || res || {};
    const rawChats: ApiChatSummary[] = Array.isArray(data.chats) ? data.chats : Array.isArray(data) ? data : [];
    const validChats = rawChats.filter((c) => c.orderStatus !== 'pending' && !c.awaitingDriver);
    const unreadSum = validChats.reduce((sum, c) => sum + (c.unread || 0), 0);

    return {
      total: validChats.length,
      limit: data.limit ?? 20,
      offset: data.offset ?? 0,
      includeClosed: Boolean(data.includeClosed),
      totalUnread: data.totalUnread !== undefined ? data.totalUnread : unreadSum,
      chats: validChats,
    };
  },

  getMessages: async (
    orderId: string,
    params?: { after?: string; before?: string; limit?: number }
  ): Promise<GetMessagesResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.after) searchParams.append('after', params.after);
    if (params?.before) searchParams.append('before', params.before);
    if (params?.limit !== undefined) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString();
    const endpoint = qs ? `/orders/${orderId}/messages?${qs}` : `/orders/${orderId}/messages`;
    const res = await apiClient.get<any>(endpoint);
    const data = res?.data || res || {};
    return {
      orderId: data.orderId || orderId,
      chat: data.chat,
      role: data.role,
      unread: data.unread ?? 0,
      cursor: data.cursor || null,
      oldestCursor: data.oldestCursor || null,
      hasOlder: Boolean(data.hasOlder),
      hasNewer: Boolean(data.hasNewer),
      messages: Array.isArray(data.messages) ? data.messages : Array.isArray(data) ? data : [],
    };
  },

  sendMessage: async (
    orderId: string,
    text: string,
    role?: string
  ): Promise<ApiChatMessage> => {
    const payload: SendMessagePayload = {
      body: text,
      text: text,
      role: role,
    };
    const res = await apiClient.post<any>(`/orders/${orderId}/messages`, payload);
    const raw = res?.data?.message || res?.data || res;
    return {
      id: raw.id || `msg-${Date.now()}`,
      orderId: raw.orderId || orderId,
      senderId: raw.senderId,
      senderRole: raw.senderRole || role,
      kind: raw.kind || 'text',
      body: raw.body || raw.text || text,
      mine: raw.mine ?? true,
      createdAt: raw.createdAt || new Date().toISOString(),
      readAt: raw.readAt || null,
    };
  },

  markAsRead: async (orderId: string): Promise<{ orderId: string; markedRead: number }> => {
    const res = await apiClient.post<any>(`/orders/${orderId}/messages/read`, {});
    const data = res?.data || res || {};
    return {
      orderId: data.orderId || orderId,
      markedRead: data.markedRead ?? 0,
    };
  },
};
