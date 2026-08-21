/**
 * lib/chat.ts
 *
 * Per-order driver<->customer static messaging powered by AsyncStorage.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'chat_session_id';
const NAME_KEY = 'chat_display_name';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  role?: string;
}

async function getOrCreateSessionId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const id = 'driver-' + Math.random().toString(36).slice(2, 10);
    await AsyncStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return 'driver-static-session';
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

const DEFAULT_MESSAGES: Record<string, ChatMessage[]> = {
  default: [
    {
      id: 'msg-sample-1',
      text: 'Hi there! I am on my way to pick up your order.',
      senderId: 'driver-static-1',
      senderName: 'Alex Driver',
      timestamp: Date.now() - 1000 * 60 * 10,
      role: 'driver',
    },
    {
      id: 'msg-sample-2',
      text: 'Great, thanks! Please leave it near the side door when you arrive.',
      senderId: 'cust-static-1',
      senderName: 'Customer',
      timestamp: Date.now() - 1000 * 60 * 8,
      role: 'customer',
    },
  ],
};

async function getStoredMessages(orderId: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(chatStorageKey(orderId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[chat] Error reading messages:', err);
  }
  const initial = DEFAULT_MESSAGES.default || [];
  await AsyncStorage.setItem(chatStorageKey(orderId), JSON.stringify(initial));
  return initial;
}

async function saveStoredMessages(orderId: string, msgs: ChatMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(chatStorageKey(orderId), JSON.stringify(msgs));
  } catch (err) {
    console.warn('[chat] Error saving messages:', err);
  }
}

interface UseOrderChatOptions {
  orderId: string;
  displayName: string;
  role: 'driver' | 'customer';
}

export function useOrderChat({ orderId, displayName, role }: UseOrderChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [sessionId, setSessionId] = useState<string>('driver-static-session');
  const sessionIdRef = useRef<string>('driver-static-session');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const sid = await getOrCreateSessionId();
      if (!isMounted) return;
      setSessionId(sid);
      sessionIdRef.current = sid;

      if (orderId) {
        const history = await getStoredMessages(orderId);
        if (isMounted) {
          setMessages(history);
          setIsConnected(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !orderId) return;

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: trimmed,
        senderId: sessionIdRef.current,
        senderName: displayName || (role === 'driver' ? 'Alex Driver' : 'Customer'),
        timestamp: Date.now(),
        role,
      };

      setMessages((prev) => {
        const next = [...prev, newMsg];
        saveStoredMessages(orderId, next);
        return next;
      });
    },
    [orderId, displayName, role]
  );

  return { messages, isConnected, sessionId, sendMessage };
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
  return () => {};
}
