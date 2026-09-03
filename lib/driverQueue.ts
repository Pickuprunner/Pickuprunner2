/**
 * Driver queue management — tracks this driver's daily orders (up to 3 per day).
 * Automatically resets to 0/3 on the next calendar day.
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
 * Checks if a date string belongs to today (local device date).
 */
export function isToday(dateString?: string): boolean {
  if (!dateString) return false;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Checks if an order was completed today.
 */
export function isDeliveredToday(order: Order): boolean {
  if (order.status !== 'delivered') return false;
  const dateToCheck = order.deliveredAt || (order as any).updatedAt || order.createdAt;
  return isToday(dateToCheck);
}

/**
 * Given the full order list and the current driver's user ID, returns:
 * - myOrders: active orders currently assigned to this driver
 * - queueCount: number of active orders (0–3)
 * - completedCount: number of orders delivered TODAY (resets to 0 on next day)
 * - completedOrders: list of orders delivered today
 * - totalDailyCount: today's completed + active orders (0–3)
 * - atCapacity: true when driver has completed or active 3 orders for today
 * - isMyOrder(orderId): quick lookup
 */
export function useDriverQueue(orders: Order[], driverUserId: string | undefined) {
  const myOrders = useMemo(() => {
    if (!driverUserId) return [];
    return orders.filter(
      (o) => o.driverUserId === driverUserId && ACTIVE_STATUSES.includes(o.status)
    );
  }, [orders, driverUserId]);

  const completedTodayOrders = useMemo(() => {
    if (!driverUserId) return [];
    return orders.filter(
      (o) => o.driverUserId === driverUserId && isDeliveredToday(o)
    );
  }, [orders, driverUserId]);

  const queueCount = myOrders.length;
  const completedTodayCount = completedTodayOrders.length;
  const completedCount = completedTodayCount; // Automatically 0 for a new day
  const totalDailyCount = queueCount + completedTodayCount;
  const atCapacity = totalDailyCount >= MAX_QUEUE;

  const myOrderIds = useMemo(() => new Set(myOrders.map((o) => o.id)), [myOrders]);
  const isMyOrder = (orderId: string) => myOrderIds.has(orderId);

  return {
    myOrders,
    queueCount,
    completedCount,
    completedTodayCount,
    completedOrders: completedTodayOrders,
    totalDailyCount,
    atCapacity,
    isMyOrder,
  };
}
