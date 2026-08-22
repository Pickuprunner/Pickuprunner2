import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG, ORDER_SCOPE } from '@/lib/config';

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

export interface CreateOrderInput {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  items: string;
  tipAmount?: number;
  distanceMiles?: number;
  cityId?: string;
  storeId?: string;
  orderScope?: string;
  hasAlcohol?: number;
  userId?: string;
  customerSessionId?: string;
}

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_sample_101',
    customerName: 'John Doe',
    customerPhone: '(555) 234-5678',
    customerEmail: 'john.doe@example.com',
    pickupAddress: '350 W Sahuarita Rd, Sahuarita, AZ 85629',
    deliveryAddress: '742 Evergreen Terrace, Sahuarita, AZ',
    items: '2x4 Pressure Treated Lumber (x10), Box of 3" Screws',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    cityId: APP_CONFIG.CITY_ID,
    storeId: APP_CONFIG.STORE_ID,
    orderScope: ORDER_SCOPE,
    tipAmount: 15.0,
    paymentStatus: 'paid',
    distanceMiles: 4.2,
    hasAlcohol: 0,
  },
  {
    id: 'ord_sample_102',
    customerName: 'Sarah Smith',
    customerPhone: '(555) 876-5432',
    customerEmail: 'sarah.smith@example.com',
    pickupAddress: '350 W Sahuarita Rd, Sahuarita, AZ 85629',
    deliveryAddress: '123 Pine St, Sahuarita, AZ',
    items: '55-inch OLED TV, High-Speed HDMI Cable 10ft',
    status: 'accepted',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    cityId: APP_CONFIG.CITY_ID,
    storeId: APP_CONFIG.STORE_ID,
    orderScope: ORDER_SCOPE,
    tipAmount: 22.5,
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
    pickupAddress: '350 W Sahuarita Rd, Sahuarita, AZ 85629',
    deliveryAddress: '888 Brannan St, Sahuarita, AZ',
    items: 'Craft Beer 12-Pack, Espresso Beans 2lb',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    cityId: APP_CONFIG.CITY_ID,
    storeId: APP_CONFIG.STORE_ID,
    orderScope: ORDER_SCOPE,
    tipAmount: 10.0,
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

interface OrderStoreState {
  orders: Order[];
  selectedOrderId: string | null;
  addOrder: (order: CreateOrderInput) => Order;
  updateOrder: (id: string, updates: Partial<Order>) => Order | null;
  claimOrder: (id: string, driverUserId: string, driverName?: string) => Order | null;
  setSelectedOrder: (id: string | null) => void;
  resetOrders: () => void;
}

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set, get) => ({
      orders: INITIAL_ORDERS,
      selectedOrderId: null,

      addOrder: (orderData) => {
        const newOrder: Order = {
          id: `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          status: 'pending',
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
    }
  )
);
