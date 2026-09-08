
import { useMemo } from 'react';
import { Order } from './orders';

export const MAX_QUEUE = 3;


const ACTIVE_STATUSES: Order['status'][] = [
  'assigned',
  'accepted',
  'shopping',
  'picked_up',
  'en_route',
];


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


export function isDeliveredToday(order: Order): boolean {
  if (order.status !== 'delivered') return false;
  const dateToCheck =
    order.deliveredAt ||
    (order as any).delivered_at ||
    (order as any).updatedAt ||
    (order as any).updated_at ||
    order.createdAt ||
    (order as any).created_at;
  return isToday(dateToCheck);
}


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
  const completedCount = completedTodayCount;
  const totalDailyCount = queueCount + completedTodayCount;
  // Rolling capacity: only active deliveries (assigned, accepted, shopping, picked_up, en_route) count against the limit of 3
  const atCapacity = queueCount >= MAX_QUEUE;

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
