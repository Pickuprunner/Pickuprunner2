import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blink } from './blink';
import { publishOrderChange } from './realtime';
import { APP_CONFIG, ORDER_SCOPE, IS_STORE_BUILD } from './config';

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  items: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered';
  createdAt: string;
  userId?: string;
  cityId?: string;
  storeId?: string;
  orderScope?: string;
  tipAmount?: number;
  paymentStatus?: string;
  distanceMiles?: number;
  customerSessionId?: string;
  hasAlcohol?: number;
  ageVerified?: number;
  ageVerifiedAt?: string;
  deliveryPhotoUrl?: string;
  driverUserId?: string;
  driverName?: string;
  deliveryNotification?: {
    sent: boolean;
    reason?: string;
    messageSid?: string;
  };
}

export const ordersTable = blink.db.table('orders');

const ORDERS_STORAGE_KEY = '@pickuprunner_static_orders_v1';

const INITIAL_STATIC_ORDERS: Order[] = [
  {
    id: 'ord_sample_101',
    customerName: 'John Doe',
    customerPhone: '(555) 234-5678',
    customerEmail: 'john.doe@example.com',
    pickupAddress: '2450 Oak St, San Francisco, CA',
    deliveryAddress: '742 Evergreen Terrace, San Francisco, CA',
    items: '2x4 Pressure Treated Lumber (x10), Box of 3" Screws',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    cityId: APP_CONFIG.CITY_ID,
    storeId: APP_CONFIG.STORE_ID,
    orderScope: ORDER_SCOPE,
    tipAmount: 15.00,
    paymentStatus: 'paid',
    distanceMiles: 4.2,
    hasAlcohol: 0,
  },
  {
    id: 'ord_sample_102',
    customerName: 'Sarah Smith',
    customerPhone: '(555) 876-5432',
    customerEmail: 'sarah.smith@example.com',
    pickupAddress: '500 Market St, San Francisco, CA',
    deliveryAddress: '123 Pine St, San Francisco, CA',
    items: '55-inch OLED TV, High-Speed HDMI Cable 10ft',
    status: 'accepted',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    cityId: APP_CONFIG.CITY_ID,
    storeId: APP_CONFIG.STORE_ID,
    orderScope: ORDER_SCOPE,
    tipAmount: 22.50,
    paymentStatus: 'paid',
    distanceMiles: 2.8,
    driverUserId: 'usr_static_driver_101',
    driverName: 'Alex Driver',
    hasAlcohol: 0,
  },
  {
    id: 'ord_sample_103',
    customerName: 'Michael Brown',
    customerPhone: '(555) 432-1098',
    customerEmail: 'michael.b@example.com',
    pickupAddress: '1200 Broadway, San Francisco, CA',
    deliveryAddress: '888 Brannan St, San Francisco, CA',
    items: 'Craft Beer 12-Pack, Espresso Beans 2lb',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    cityId: APP_CONFIG.CITY_ID,
    storeId: APP_CONFIG.STORE_ID,
    orderScope: ORDER_SCOPE,
    tipAmount: 10.00,
    paymentStatus: 'paid',
    distanceMiles: 5.1,
    driverUserId: 'usr_static_driver_101',
    driverName: 'Alex Driver',
    hasAlcohol: 1,
    ageVerified: 1,
    ageVerifiedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    deliveryPhotoUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500',
  },
];

async function getStoredOrders(): Promise<Order[]> {
  try {
    const raw = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[orders] Error loading from AsyncStorage:', err);
  }
  // Fallback to initial mock orders
  await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_STATIC_ORDERS));
  return INITIAL_STATIC_ORDERS;
}

async function saveStoredOrders(orders: Order[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.warn('[orders] Error saving to AsyncStorage:', err);
  }
}

/** Send a delivery notification email to the customer (mock) */
async function sendDeliveryNotification(order: Order) {
  console.log('[Mock Notification] Delivery email trigger for order:', order.id);
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders', APP_CONFIG.CITY_ID],
    queryFn: async () => {
      return await getStoredOrders();
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: async () => {
      const orders = await getStoredOrders();
      const match = orders.find((o) => o.id === id);
      if (!match) throw new Error(`Order ${id} not found`);
      return match;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      pickupAddress: string;
      deliveryAddress: string;
      items: string;
    }) => {
      const newOrder: Order = {
        id: `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail ?? '',
        pickupAddress: order.pickupAddress,
        deliveryAddress: order.deliveryAddress,
        items: order.items,
        status: 'pending',
        createdAt: new Date().toISOString(),
        cityId: APP_CONFIG.CITY_ID,
        storeId: APP_CONFIG.STORE_ID,
        orderScope: ORDER_SCOPE,
        tipAmount: 10.0,
        paymentStatus: 'paid',
        distanceMiles: 3.5,
      };

      const existing = await getStoredOrders();
      const updated = [newOrder, ...existing];
      await saveStoredOrders(updated);
      return newOrder;
    },
    onSuccess: async (newOrder) => {
      queryClient.setQueryData<Order[]>(['orders', APP_CONFIG.CITY_ID], (old = []) => [newOrder, ...old]);
      await publishOrderChange({
        orderId: newOrder.id,
        type: 'created',
        customerName: newOrder.customerName,
        deliveryAddress: newOrder.deliveryAddress,
        items: newOrder.items,
      });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      ageVerified,
      ageVerifiedAt,
      deliveryPhotoUrl,
      driverUserId,
      driverName,
    }: {
      id: string;
      status: 'delivered' | 'accepted' | 'picked_up' | 'pending';
      ageVerified?: number;
      ageVerifiedAt?: string;
      deliveryPhotoUrl?: string;
      driverUserId?: string;
      driverName?: string;
    }) => {
      if (!id) throw new Error('Order ID missing');
      const existing = await getStoredOrders();
      const index = existing.findIndex((o) => o.id === id);
      if (index === -1) throw new Error(`Order ${id} not found`);

      const target = existing[index];
      const updatedOrder: Order = {
        ...target,
        status,
        ...(ageVerified !== undefined ? { ageVerified } : {}),
        ...(ageVerifiedAt ? { ageVerifiedAt } : {}),
        ...(deliveryPhotoUrl ? { deliveryPhotoUrl } : {}),
        ...(driverUserId ? { driverUserId } : {}),
        ...(driverName ? { driverName } : {}),
      };

      existing[index] = updatedOrder;
      await saveStoredOrders(existing);
      return updatedOrder;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      const previousOrders = queryClient.getQueryData<Order[]>(['orders', APP_CONFIG.CITY_ID]);
      queryClient.setQueryData<Order[]>(['orders', APP_CONFIG.CITY_ID], (old = []) =>
        old.map((o) => (o.id === id ? { ...o, status } : o))
      );
      return { previousOrders };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders', APP_CONFIG.CITY_ID], context.previousOrders);
      }
    },
    onSuccess: async (_updated, vars) => {
      const { id, status, deliveryPhotoUrl } = vars;
      await publishOrderChange({ orderId: id, type: 'updated', status });
      if (status === 'delivered') {
        const allOrders = queryClient.getQueryData<Order[]>(['orders', APP_CONFIG.CITY_ID]);
        let order = allOrders?.find((o) => o.id === id);
        if (!order) order = { id, status } as Order;
        const fullOrder: Order = {
          ...order,
          deliveryPhotoUrl: deliveryPhotoUrl ?? order.deliveryPhotoUrl,
        };
        sendDeliveryNotification(fullOrder);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      queryClient.invalidateQueries({ queryKey: ['order', vars.id] });
    },
  });
}
