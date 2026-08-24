import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG, ORDER_SCOPE } from '@/lib/config';

export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'shopping'
  | 'picked_up'
  | 'en_route'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  items: string;
  status: OrderStatus;
  createdAt: string;
  customerId?: string;
  userId?: string;
  cityId?: string;
  storeId?: string;
  orderScope?: string;
  tipAmount?: number;
  paymentStatus?: string;
  distanceMiles?: number;
  customerSessionId?: string;
  hasAlcohol?: number;
  ageVerified?: number | boolean;
  ageVerifiedAt?: string;
  deliveryPhotoUrl?: string;
  deliveredAt?: string;
  driverUserId?: string;
  driverName?: string;
  deliveryNotification?: {
    sent: boolean;
    reason?: string;
    messageSid?: string;
  };
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  pickup_address?: string;
  delivery_address?: string;
  driver_user_id?: string;
  driver_name?: string;
  tip_amount?: number;
  distance_miles?: number;
  payment_status?: string;
  delivery_photo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOrderInput {
  id?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  items: string;
  status?: OrderStatus;
  tipAmount?: number;
  distanceMiles?: number;
  cityId?: string;
  storeId?: string;
  orderScope?: string;
  hasAlcohol?: number;
  userId?: string;
  customerId?: string;
  customerSessionId?: string;
}

export const INITIAL_ORDERS: Order[] = [];

interface OrderStoreState {
  orders: Order[];
  selectedOrderId: string | null;
  upsertOrder: (order: Order | any) => Order;
  setOrders: (orders: Order[]) => void;
  addOrder: (order: CreateOrderInput) => Order;
  updateOrder: (id: string, updates: Partial<Order>) => Order | null;
  claimOrder: (id: string, driverUserId: string, driverName?: string) => Order | null;
  setSelectedOrder: (id: string | null) => void;
  resetOrders: () => void;
}

async function syncCustomerLocalOrders(updatedOrder: Partial<Order> & { id: string }) {
  try {
    const raw = await AsyncStorage.getItem('customer_local_orders');
    if (raw) {
      const list = JSON.parse(raw);
      const index = list.findIndex((o: any) => o.id === updatedOrder.id);
      if (index !== -1) {
        list[index] = { ...list[index], ...updatedOrder };
        await AsyncStorage.setItem('customer_local_orders', JSON.stringify(list));
      }
    }
  } catch {}
}

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set, get) => ({
      orders: INITIAL_ORDERS,
      selectedOrderId: null,

      upsertOrder: (incoming) => {
        const orderId = incoming.id;
        const normalized: Order = {
          id: orderId,
          customerName: incoming.customerName || incoming.customer_name || 'Customer',
          customerPhone: incoming.customerPhone || incoming.customer_phone || '',
          customerEmail: incoming.customerEmail || incoming.customer_email,
          pickupAddress: incoming.pickupAddress || incoming.pickup_address || '',
          deliveryAddress: incoming.deliveryAddress || incoming.delivery_address || '',
          items: incoming.items || '',
          status: incoming.status || 'pending',
          createdAt: incoming.createdAt || incoming.created_at || new Date().toISOString(),
          customerId: incoming.customerId || incoming.customer_id,
          userId: incoming.userId,
          cityId: incoming.cityId || incoming.city_id || APP_CONFIG.CITY_ID,
          storeId: incoming.storeId || incoming.store_id || APP_CONFIG.STORE_ID,
          orderScope: incoming.orderScope || incoming.order_scope || ORDER_SCOPE,
          tipAmount: incoming.tipAmount ?? incoming.tip_amount ?? 10.0,
          paymentStatus: incoming.paymentStatus || incoming.payment_status || 'unpaid',
          distanceMiles: incoming.distanceMiles ?? incoming.distance_miles ?? 0,
          customerSessionId: incoming.customerSessionId || incoming.customer_session_id,
          hasAlcohol: incoming.hasAlcohol ?? 0,
          ageVerified: incoming.ageVerified ?? incoming.age_verified,
          ageVerifiedAt: incoming.ageVerifiedAt ?? incoming.age_verified_at,
          deliveryPhotoUrl: incoming.deliveryPhotoUrl || incoming.delivery_photo_url,
          deliveredAt: incoming.deliveredAt || incoming.delivered_at,
          driverUserId: incoming.driverUserId || incoming.driver_user_id,
          driverName: incoming.driverName || incoming.driver_name,
          deliveryNotification: incoming.deliveryNotification,
        };

        set((state) => {
          const index = state.orders.findIndex((o) => o.id === orderId);
          if (index === -1) {
            return { orders: [normalized, ...state.orders] };
          }
          const updated = [...state.orders];
          updated[index] = { ...updated[index], ...normalized };
          return { orders: updated };
        });

        syncCustomerLocalOrders(normalized);
        return normalized;
      },

      setOrders: (orders) => set({ orders }),

      addOrder: (orderData) => {
        const newOrder: Order = {
          id: orderData.id || `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          status: orderData.status || 'pending',
          createdAt: new Date().toISOString(),
          cityId: orderData.cityId || APP_CONFIG.CITY_ID,
          storeId: orderData.storeId || APP_CONFIG.STORE_ID,
          orderScope: orderData.orderScope || ORDER_SCOPE,
          paymentStatus: 'paid',
          tipAmount: orderData.tipAmount ?? 10.0,
          distanceMiles: orderData.distanceMiles ?? 3.5,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone || '(555) 000-0000',
          customerEmail: orderData.customerEmail || '',
          pickupAddress: orderData.pickupAddress,
          deliveryAddress: orderData.deliveryAddress,
          items: orderData.items,
          hasAlcohol: orderData.hasAlcohol ?? 0,
          userId: orderData.userId,
          customerId: orderData.customerId,
          customerSessionId: orderData.customerSessionId,
        };

        set((state) => ({ orders: [newOrder, ...state.orders] }));
        return newOrder;
      },

      updateOrder: (id, updates) => {
        let updated: Order | null = null;
        set((state) => {
          const index = state.orders.findIndex((o) => o.id === id);
          if (index === -1) return state;
          const target = state.orders[index];
          updated = { ...target, ...updates };
          const copy = [...state.orders];
          copy[index] = updated;
          return { orders: copy };
        });
        if (updated) {
          syncCustomerLocalOrders(updated);
        }
        return updated;
      },

      claimOrder: (id, driverUserId, driverName) => {
        return get().updateOrder(id, {
          status: 'accepted',
          driverUserId,
          driverName: driverName || 'Alex Driver',
        });
      },

      setSelectedOrder: (id) => set({ selectedOrderId: id }),

      resetOrders: () => set({ orders: INITIAL_ORDERS }),
    }),
    {
      name: 'order-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.orders) {
          state.orders = state.orders.filter((o) => o?.id && !o.id.startsWith('ord_sample_'));
        }
      },
    }
  )
);
