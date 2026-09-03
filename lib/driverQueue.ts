/**
 * Driver queue management — tracks this driver's active orders (up to 3)
 * and completed orders count.
 */

import { useMemo } from 'react';
import { Order } from './orders';

export const MAX_QUEUE = 3;

/** Active statuses that count toward the driver's active queue */
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
 * - completedCount: number of completed/delivered orders
 * - completedOrders: list of completed orders
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

  const completedOrders = useMemo(() => {
    if (!driverUserId) return [];
    return orders.filter(
      (o) => o.driverUserId === driverUserId && o.status === 'delivered'
    );
  }, [orders, driverUserId]);

  const queueCount = myOrders.length;
  const completedCount = completedOrders.length;
  const atCapacity = queueCount >= MAX_QUEUE;

  const myOrderIds = useMemo(() => new Set(myOrders.map((o) => o.id)), [myOrders]);
  const isMyOrder = (orderId: string) => myOrderIds.has(orderId);

  return { myOrders, queueCount, completedCount, completedOrders, atCapacity, isMyOrder };
}
