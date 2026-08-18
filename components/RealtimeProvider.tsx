import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useOrdersRealtime, NewOrderAlert } from '@/lib/realtime';
import { requestNotificationPermissions, setupNotificationHandler } from '@/lib/notifications';
import { subscribeToOrderChats, IncomingChatMessage } from '@/lib/chat';
import { useOrders } from '@/lib/orders';
import { useDriverId } from '@/hooks/useDriverId';
import NewOrderBanner from './NewOrderBanner';
import ChatMessageBanner from './ChatMessageBanner';

/**
 * Mounts all realtime subscriptions at app-root level.
 * Must be rendered inside QueryClientProvider.
 *
 * Handles:
 * - Order-change realtime → order list refresh + new-order push/banner
 * - Per-order chat background subscription → chat push notifications + in-app banner
 */
export function RealtimeProvider() {
  const [pendingOrderAlert, setPendingOrderAlert] = useState<NewOrderAlert | null>(null);
  const [pendingChatMessage, setPendingChatMessage] = useState<IncomingChatMessage | null>(null);

  const { data: orders = [] } = useOrders();
  const driverId = useDriverId();

  // Active order IDs for this driver
  const activeOrderIds = orders
    .filter((o) => o.driverUserId === driverId && (o.status === 'accepted' || o.status === 'picked_up'))
    .map((o) => o.id);

  // Setup notification handler + request permissions after mount (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    setupNotificationHandler();
    requestNotificationPermissions();
  }, []);

  // ── Orders realtime ───────────────────────────────────────────────────────
  const handleNewOrder = useCallback((alert: NewOrderAlert) => {
    setPendingOrderAlert(alert);
  }, []);

  useOrdersRealtime(handleNewOrder);

  // ── Per-order chat background subscription ────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (activeOrderIds.length === 0) return;

    let cleanup: (() => void) | null = null;
    let mounted = true;

    const timer = setTimeout(() => {
      subscribeToOrderChats(activeOrderIds, (msg) => {
        if (!mounted) return;
        setPendingChatMessage(msg);
      })
        .then((unsubscribe) => {
          if (!mounted) {
            unsubscribe();
          } else {
            cleanup = unsubscribe;
          }
        })
        .catch((err) => {
          console.warn('[RealtimeProvider] order chat subscription failed:', err);
        });
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
      cleanup?.();
    };
  }, [activeOrderIds.join(',')]); // re-subscribe when active orders change

  return (
    <>
      <NewOrderBanner
        alert={pendingOrderAlert}
        onDismiss={() => setPendingOrderAlert(null)}
      />
      <ChatMessageBanner
        message={pendingChatMessage}
        onDismiss={() => setPendingChatMessage(null)}
      />
    </>
  );
}
