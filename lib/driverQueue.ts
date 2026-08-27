/**
 * Driver queue management — tracks this driver's active orders (up to 3).
 *
 * "Active" = accepted or picked_up (not yet delivered).
 * The driver's user ID is stamped onto an order when they accept it so we
 * can identify their orders across devices / after refresh.
 */

import { useMemo } from 'react';
import { Order } from './orders';

export const MAX_QUEUE = 3;

/** Active statuses that count toward the driver's queue */
const ACTIVE_STATUSES: Order['status'][] = [
  'assigned',
  'accepted',
  'shopping',
  'picked_up',
  'en_route',
];

/**
 * Given the full order list and the current driver's user ID, returns:
 * - myOrders: orders currently assigned to this driver that are still active
 * - queueCount: number of active orders (0–3)
 * - atCapacity: true when driver has 3 active orders
 * - isMyOrder(orderId): quick lookup
 */
export function useDriverQueue(orders: Order[], driverUserId: string | undefined) {
  const myOrders = useMemo(() => {
    if (!driverUserId) return [];
    return orders.filter(
      (o) => o.driverUserId === driverUserId && ACTIVE_STATUSES.includes(o.status)
    );
  }, [orders, driverUserId]);

  const queueCount = myOrders.length;
  const atCapacity = queueCount >= MAX_QUEUE;

  const myOrderIds = useMemo(() => new Set(myOrders.map((o) => o.id)), [myOrders]);
  const isMyOrder = (orderId: string) => myOrderIds.has(orderId);

  return { myOrders, queueCount, atCapacity, isMyOrder };
}
