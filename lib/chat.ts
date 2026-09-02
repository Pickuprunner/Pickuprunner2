import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatApi, ApiChatMessage } from '@/apis/chat';
import { useChatStore } from '@/store/useChatStore';

const SESSION_KEY = 'chat_session_id';
const NAME_KEY = 'chat_display_name';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  role?: string;
  mine?: boolean;
  readAt?: string | null;
}

async function getOrCreateSessionId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const id = 'session-' + Math.random().toString(36).slice(2, 10);
    await AsyncStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return 'static-session';
  }
}

export async function getSavedDisplayName(): Promise<string> {
  try {
    const name = await AsyncStorage.getItem(NAME_KEY);
    return name || '';
  } catch {
    return '';
  }
}

export async function saveDisplayName(name: string): Promise<void> {
  try {
    await AsyncStorage.setItem(NAME_KEY, name.trim());
    await AsyncStorage.setItem('driver_display_name', name.trim());
  } catch (err) {
    console.warn('[chat] Error saving display name:', err);
  }
}

function chatStorageKey(orderId: string): string {
  return `@pickuprunner_chat_${orderId}`;
}

function mapApiToChatMessage(msg: ApiChatMessage, currentRole: 'driver' | 'customer'): ChatMessage {
  const ts = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now();
  const role = msg.senderRole || (msg.mine ? currentRole : currentRole === 'driver' ? 'customer' : 'driver');
  const isMine = msg.mine === true || role === currentRole;

  return {
    id: msg.id,
    text: msg.body || (msg as any).text || '',
    senderId: msg.senderId || (isMine ? 'me' : 'other'),
    senderName: role === 'system' ? 'System' : role === 'driver' ? 'Driver' : 'Customer',
    timestamp: isNaN(ts) ? Date.now() : ts,
    role,
    mine: isMine,
    readAt: msg.readAt,
  };
}

export function isOrderActive(status?: string): boolean {
  if (!status) return true;
  const s = status.toLowerCase();
  return s === 'accepted' || s === 'shopping' || s === 'picked_up' || s === 'en_route' || s === 'active';
}

interface UseOrderChatOptions {
  orderId: string;
  orderStatus?: string;
  displayName: string;
  role: 'driver' | 'customer';
}

export function useOrderChat({ orderId, orderStatus, displayName, role }: UseOrderChatOptions) {
  const storeMessages = useChatStore((state) => (orderId ? state.conversations[orderId] || [] : []));
  const [isLoading, setIsLoading] = useState(() => {
    if (!orderId) return false;
    const existing = useChatStore.getState().getMessages(orderId);
    return !existing || existing.length === 0;
  });
  const [isConnected, setIsConnected] = useState(true);
  const [sessionId, setSessionId] = useState<string>('static-session');
  const sessionIdRef = useRef<string>('static-session');
  const orderIdRef = useRef<string>(orderId);
  orderIdRef.current = orderId;

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }
    const cached = useChatStore.getState().getMessages(orderId);
    setIsLoading(!cached || cached.length === 0);
  }, [orderId]);

  const fetchAndSyncMessages = useCallback(async () => {
    if (!orderIdRef.current) return;
    const currentOrderId = orderIdRef.current;

    try {
      const res = await chatApi.getMessages(currentOrderId);
      setIsConnected(true);

      if (res.messages && Array.isArray(res.messages)) {
        const mapped = res.messages.map((m) => mapApiToChatMessage(m, role));
        const prev = useChatStore.getState().getMessages(currentOrderId);
        const existingIds = new Set(prev.map((p) => p.id));
        const newIncoming = mapped.filter((m) => !m.mine && !existingIds.has(m.id));

        if (newIncoming.length > 0 && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        }

        useChatStore.getState().setMessages(currentOrderId, mapped);
        AsyncStorage.setItem(chatStorageKey(currentOrderId), JSON.stringify(mapped)).catch(() => { });
      }

      if (res.unread && res.unread > 0) {
        chatApi.markAsRead(currentOrderId).catch(() => { });
      }
    } catch (err) {
      console.warn('[chat] Failed to fetch live messages:', err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    let isMounted = true;
    const isActive = isOrderActive(orderStatus);

    (async () => {
      const sid = await getOrCreateSessionId();
      if (!isMounted) return;
      setSessionId(sid);
      sessionIdRef.current = sid;

      if (!orderId) {
        setIsLoading(false);
        return;
      }

      const storeMsgs = useChatStore.getState().getMessages(orderId);
      if (!storeMsgs || storeMsgs.length === 0) {
        try {
          const raw = await AsyncStorage.getItem(chatStorageKey(orderId));
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
              useChatStore.getState().setMessages(orderId, parsed);
              setIsLoading(false);
            }
          }
        } catch { }
      } else {
        setIsLoading(false);
      }

      await fetchAndSyncMessages();
      if (isMounted) {
        setIsLoading(false);
      }
      chatApi.markAsRead(orderId).catch(() => { });
    })();

    let intervalId: any = null;
    if (isActive) {
      intervalId = setInterval(() => {
        if (orderIdRef.current) {
          fetchAndSyncMessages();
        }
      }, 3000);
    }

    if (orderId) {
      useChatStore.getState().setActiveThreadOrderId(orderId);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (orderId) {
        useChatStore.getState().setActiveThreadOrderId(null);
      }
    };
  }, [orderId, orderStatus, fetchAndSyncMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !orderId) return;

      const tempMsg: ChatMessage = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: trimmed,
        senderId: sessionIdRef.current,
        senderName: displayName || (role === 'driver' ? 'Driver' : 'Customer'),
        timestamp: Date.now(),
        role,
        mine: true,
      };

      const current = useChatStore.getState().getMessages(orderId);
      const next = [...current, tempMsg];
      useChatStore.getState().setMessages(orderId, next);
      AsyncStorage.setItem(chatStorageKey(orderId), JSON.stringify(next)).catch(() => { });

      try {
        const sent = await chatApi.sendMessage(orderId, trimmed, role);
        setIsConnected(true);
        const mappedSent = mapApiToChatMessage(sent, role);

        const currentAfter = useChatStore.getState().getMessages(orderId);
        const filtered = currentAfter.filter((m) => m.id !== tempMsg.id);
        const updated = [...filtered, mappedSent];
        useChatStore.getState().setMessages(orderId, updated);
        AsyncStorage.setItem(chatStorageKey(orderId), JSON.stringify(updated)).catch(() => { });

        fetchAndSyncMessages();
      } catch (err) {
        console.warn('[chat] Error sending message to API:', err);
        setIsConnected(false);
      }
    },
    [orderId, displayName, role, fetchAndSyncMessages]
  );

  return {
    messages: storeMessages,
    isLoading: isLoading && storeMessages.length === 0,
    isConnected,
    sessionId,
    sendMessage,
    refreshMessages: fetchAndSyncMessages,
  };
}

export interface IncomingChatMessage {
  senderName: string;
  text: string;
  senderId: string;
  orderId: string;
}

export async function subscribeToOrderChats(
  _orderIds: string[],
  _onMessage: (msg: IncomingChatMessage) => void
): Promise<() => void> {
  return () => { };
}
