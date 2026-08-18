import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { blink } from './blink';
import { notifyNewOrder } from './notifications';

const CHANNEL_NAME = 'order-updates';

// Stable anonymous session ID — same across the lifecycle of the app
const SESSION_ID = 'driver-' + Math.random().toString(36).slice(2, 10);

// Singleton publish channel so we don't open/close a new WS on every mutation
let _pubChannel: any = null;

async function getPubChannel() {
  if (_pubChannel) return _pubChannel;
  _pubChannel = blink.realtime.channel(CHANNEL_NAME);
  // Fire-and-forget subscribe — never await so publish path never blocks
  _pubChannel.subscribe({ userId: SESSION_ID }).catch(() => {
    _pubChannel = null;
  });
  return _pubChannel;
}

/**
 * Broadcast an order change to every connected device.
 * Called after create / update mutations.
 */
export async function publishOrderChange(payload: {
  orderId: string;
  type: 'created' | 'updated' | 'deleted';
  status?: string;
  // Extra fields used to populate the push notification
  customerName?: string;
  deliveryAddress?: string;
  items?: string;
}) {
  try {
    const ch = await getPubChannel();
    await ch.publish('order-changed', payload, { userId: SESSION_ID });
  } catch (err) {
    // Non-fatal — optimistic update already applied locally
    console.warn('[realtime] publish failed:', err);
    _pubChannel = null; // reset so next call retries
  }
}

export interface NewOrderAlert {
  orderId: string;
  customerName: string;
  deliveryAddress: string;
  items: string;
}

/**
 * Hook: subscribe to the shared orders channel.
 * On any incoming 'order-changed' event:
 *   - Invalidates React Query (all screens refresh)
 *   - Fires a local push notification (iOS/Android) for 'created' events
 *   - Calls onNewOrder callback (used for the web in-app banner)
 *
 * Returns { isConnected }.
 * The subscribe is fully non-blocking — the component renders immediately
 * and connectivity arrives whenever the WS handshake completes.
 */
export function useOrdersRealtime(onNewOrder?: (alert: NewOrderAlert) => void) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  const onNewOrderRef = useRef(onNewOrder);

  // Keep ref current without re-triggering the effect
  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  }, [onNewOrder]);

  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    const connect = () => {
      try {
        channel = blink.realtime.channel(CHANNEL_NAME);
        channelRef.current = channel;

        // Non-blocking subscribe — never awaited, never times out
        channel.subscribe({ userId: SESSION_ID })
          .then(() => {
            if (!mounted) return;
            setIsConnected(true);
          })
          .catch(() => {
            // WS unavailable — silently degrade, app still works
            if (mounted) setIsConnected(false);
          });

        channel.onMessage((msg: any) => {
          if (!mounted) return;
          if (msg.type !== 'order-changed') return;

          // Always refresh order list on every connected device
          queryClient.invalidateQueries({ queryKey: ['orders'] });

          const payload = msg.data as {
            orderId?: string;
            type?: string;
            customerName?: string;
            deliveryAddress?: string;
            items?: string;
          };

          // Only alert on brand-new orders
          if (payload.type === 'created' && payload.orderId) {
            const alert: NewOrderAlert = {
              orderId: payload.orderId,
              customerName: payload.customerName ?? 'New customer',
              deliveryAddress: payload.deliveryAddress ?? '',
              items: payload.items ?? '',
            };

            // Native: local push notification
            notifyNewOrder(alert);

            // Web / in-app: callback for banner
            onNewOrderRef.current?.(alert);
          }
        });
      } catch (err) {
        console.warn('[realtime] channel setup failed:', err);
      }
    };

    connect();

    return () => {
      mounted = false;
      channel?.unsubscribe().catch(() => {});
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [queryClient]);

  return { isConnected };
}
