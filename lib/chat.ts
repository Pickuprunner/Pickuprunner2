/**
 * lib/chat.ts
 *
 * Per-order driver↔customer messaging powered by Blink Realtime.
 * - Each order gets its own channel: `order-chat-{orderId}`.
 * - Only the assigned driver and the customer (via session ID) can message.
 * - No group chat between drivers.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blink } from './blink';
import { notifyChatMessage } from './notifications';

/** Returns the best available display name: auth > AsyncStorage > generated fallback. */
async function resolveDisplayName(sessionId: string): Promise<string> {
  if (Platform.OS !== 'web') {
    try {
      const authUser = await Promise.race([
        blink.auth.me(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);
      if (authUser?.displayName) return authUser.displayName;
      if (authUser?.email) {
        const fromEmail = authUser.email.split('@')[0];
        return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1);
      }
    } catch {
      // Not signed in — fall through
    }
  }
  try {
    const stored = await AsyncStorage.getItem(NAME_KEY);
    if (stored) return stored;
  } catch {
    // AsyncStorage unavailable
  }
  return `Driver ${sessionId.slice(-4).toUpperCase()}`;
}

// ── Identity ────────────────────────────────────────────────────────────────

const SESSION_KEY = 'chat_session_id';
const NAME_KEY = 'chat_display_name';

/** Returns a stable session ID, creating one on first call. */
async function getOrCreateSessionId(): Promise<string> {
  const stored = await AsyncStorage.getItem(SESSION_KEY);
  if (stored) return stored;
  const id = 'driver-' + Math.random().toString(36).slice(2, 10);
  await AsyncStorage.setItem(SESSION_KEY, id);
  return id;
}

/** Reads the saved display name (or returns a fallback). */
export async function getSavedDisplayName(): Promise<string> {
  const name = await AsyncStorage.getItem(NAME_KEY);
  return name || '';
}

/** Saves a display name for this device. */
export async function saveDisplayName(name: string): Promise<void> {
  await AsyncStorage.setItem(NAME_KEY, name.trim());
  await AsyncStorage.setItem('driver_display_name', name.trim());
}

/** Build the per-order channel name. */
function orderChannel(orderId: string): string {
  return `order-chat-${orderId}`;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  /** 'driver' or 'customer' */
  role?: string;
}

// ── Per-order chat hook ──────────────────────────────────────────────────────

interface UseOrderChatOptions {
  orderId: string;
  displayName: string;
  /** 'driver' or 'customer' — stamped on outgoing messages. */
  role: 'driver' | 'customer';
}

export function useOrderChat({ orderId, displayName, role }: UseOrderChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const channelRef = useRef<any>(null);
  const sessionIdRef = useRef<string>('');
  const displayNameRef = useRef(displayName);

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  useEffect(() => {
    if (!orderId) return;

    let mounted = true;
    let channel: any = null;

    const connect = async () => {
      try {
        const sid = await getOrCreateSessionId();
        if (!mounted) return;
        sessionIdRef.current = sid;
        setSessionId(sid);

        const effectiveName = displayNameRef.current || await resolveDisplayName(sid);

        channel = blink.realtime.channel(orderChannel(orderId));
        channelRef.current = channel;

        await channel.subscribe({
          userId: sid,
          metadata: { displayName: effectiveName, role },
        });

        if (!mounted) return;
        setIsConnected(true);

        channel.onMessage((msg: any) => {
          if (!mounted) return;
          if (msg.type !== 'chat') return;

          const incoming: ChatMessage = {
            id: msg.id,
            text: msg.data?.text ?? '',
            senderId: msg.userId ?? '',
            senderName: msg.metadata?.displayName ?? 'User',
            timestamp: msg.timestamp ?? Date.now(),
            role: msg.metadata?.role,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        });

        // Load history
        try {
          const history = await channel.getMessages({ limit: 50 });
          if (!mounted) return;
          const parsed: ChatMessage[] = history
            .filter((m: any) => m.type === 'chat')
            .map((m: any) => ({
              id: m.id,
              text: m.data?.text ?? '',
              senderId: m.userId ?? '',
              senderName: m.metadata?.displayName ?? 'User',
              timestamp: m.timestamp ?? 0,
              role: m.metadata?.role,
            }));
          setMessages(parsed);
        } catch {
          // History unavailable
        }
      } catch (err) {
        console.warn('[order-chat] connect failed:', err);
        if (mounted) setIsConnected(false);
      }
    };

    connect();

    return () => {
      mounted = false;
      channel?.unsubscribe().catch(() => {});
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [orderId, role]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !channelRef.current || !sessionIdRef.current) return;

      const effectiveName =
        displayNameRef.current || await resolveDisplayName(sessionIdRef.current);

      const optimisticId = `opt-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: optimisticId,
        text: trimmed,
        senderId: sessionIdRef.current,
        senderName: effectiveName,
        timestamp: Date.now(),
        role,
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        await channelRef.current.publish(
          'chat',
          { text: trimmed },
          { userId: sessionIdRef.current, metadata: { displayName: effectiveName, role } }
        );
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        console.warn('[order-chat] send failed:', err);
        throw err;
      }
    },
    [role]
  );

  return { messages, isConnected, sessionId, sendMessage };
}

// ── Background chat subscription (per-order) ─────────────────────────────────

export interface IncomingChatMessage {
  senderName: string;
  text: string;
  senderId: string;
  orderId: string;
}

/**
 * Subscribe to background chat notifications for a set of order IDs.
 * Returns an unsubscribe function.
 */
export async function subscribeToOrderChats(
  orderIds: string[],
  onMessage: (msg: IncomingChatMessage) => void
): Promise<() => void> {
  const sessionId = await getOrCreateSessionId();
  const effectiveName = await resolveDisplayName(sessionId);
  const channels: any[] = [];

  for (const oid of orderIds) {
    try {
      const ch = blink.realtime.channel(orderChannel(oid));
      await ch.subscribe({
        userId: sessionId,
        metadata: { displayName: effectiveName, role: 'driver' },
      });

      ch.onMessage((msg: any) => {
        if (msg.type !== 'chat') return;
        if (msg.userId === sessionId) return;

        const incoming: IncomingChatMessage = {
          senderName: msg.metadata?.displayName ?? 'Customer',
          text: msg.data?.text ?? '',
          senderId: msg.userId ?? '',
          orderId: oid,
        };

        notifyChatMessage({ senderName: incoming.senderName, text: incoming.text });
        onMessage(incoming);
      });

      channels.push(ch);
    } catch {
      // channel unavailable — skip
    }
  }

  return () => {
    for (const ch of channels) {
      ch.unsubscribe().catch(() => {});
    }
  };
}
