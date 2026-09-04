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
  pickupLat?: number;
  pickupLng?: number;
  pickup_lat?: number;
  pickup_lng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  pickupPlaceId?: string;
  pickup_place_id?: string;
  deliveryPlaceId?: string;
  delivery_place_id?: string;
  pickupLocationSource?: 'nominatim' | 'photon' | 'manual';
  pickup_location_source?: 'nominatim' | 'photon' | 'manual';
  deliveryLocationSource?: 'nominatim' | 'photon' | 'manual';
  delivery_location_source?: 'nominatim' | 'photon' | 'manual';
  pickupPrecision?: string;
  pickup_precision?: string;
  deliveryPrecision?: string;
  delivery_precision?: string;
  pickupDistanceMiles?: number;
  earningsCents?: number;
  items: string;
  status: OrderStatus;
  createdAt: string;
  customerId?: string;
  customer_id?: string;
  userId?: string;
  cityId?: string;
  storeId?: string;
  orderScope?: string;
  tipAmount?: number;
  paymentStatus?: string;
  checkoutUrl?: string;
  checkoutSessionId?: string;
  distanceMiles?: number;
  customerSessionId?: string;
  customer_session_id?: string;
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
  checkout_url?: string;
  checkout_session_id?: string;
  delivery_photo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOrderInput {
  id?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  pickupPlaceId?: string;
  deliveryPlaceId?: string;
  pickupLocationSource?: 'nominatim' | 'photon' | 'manual';
  deliveryLocationSource?: 'nominatim' | 'photon' | 'manual';
  pickupPrecision?: string;
  deliveryPrecision?: string;
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
  checkoutUrl?: string;
  checkoutSessionId?: string;
}

export const INITIAL_ORDERS: Order[] = [];

interface OrderStoreState {
  orders: Order[];
  selectedOrderId: string | null;
  upsertOrder: (order: Order | any) => Order;
  setOrders: (orders: Order[]) => void;
  setAvailableOrders: (orders: Order[]) => void;
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
        let finalOrder: Order = incoming as Order;

        set((state) => {
          const index = state.orders.findIndex((o) => o.id === orderId);
          const existing = index !== -1 ? state.orders[index] : null;

          const incomingName = (incoming.customerName || incoming.customer_name || '').trim();
          const existingName = (existing?.customerName || existing?.customer_name || '').trim();
          const resolvedCustomerName =
            incomingName && incomingName !== 'Customer' && incomingName !== 'Customer Order'
              ? incomingName
              : existingName || incomingName || 'Customer';

          const isExistingActive =
            existing &&
            (existing.status === 'accepted' ||
              existing.status === 'assigned' ||
              existing.status === 'shopping' ||
              existing.status === 'picked_up' ||
              existing.status === 'en_route' ||
              existing.status === 'delivered');

          const incomingStatus = incoming.status || incoming.order_status;
          const resolvedStatus =
            incomingStatus === 'pending' && isExistingActive
              ? existing.status
              : incomingStatus || existing?.status || 'pending';

          const normalized: Order = {
            id: orderId,
            customerName: resolvedCustomerName,
            customerPhone: incoming.customerPhone || incoming.customer_phone || existing?.customerPhone || '',
            customerEmail: incoming.customerEmail || incoming.customer_email || existing?.customerEmail,
            pickupAddress: incoming.pickupAddress || incoming.pickup_address || existing?.pickupAddress || '',
            deliveryAddress: incoming.deliveryAddress || incoming.delivery_address || existing?.deliveryAddress || '',
            pickupLat: incoming.pickupLat != null ? Number(incoming.pickupLat) : incoming.pickup_lat != null ? Number(incoming.pickup_lat) : existing?.pickupLat,
            pickupLng: incoming.pickupLng != null ? Number(incoming.pickupLng) : incoming.pickup_lng != null ? Number(incoming.pickup_lng) : existing?.pickupLng,
            deliveryLat: incoming.deliveryLat != null ? Number(incoming.deliveryLat) : incoming.delivery_lat != null ? Number(incoming.delivery_lat) : existing?.deliveryLat,
            deliveryLng: incoming.deliveryLng != null ? Number(incoming.deliveryLng) : incoming.delivery_lng != null ? Number(incoming.delivery_lng) : existing?.deliveryLng,
            pickupPlaceId: incoming.pickupPlaceId || incoming.pickup_place_id || existing?.pickupPlaceId,
            deliveryPlaceId: incoming.deliveryPlaceId || incoming.delivery_place_id || existing?.deliveryPlaceId,
            pickupLocationSource: incoming.pickupLocationSource || incoming.pickup_location_source || existing?.pickupLocationSource,
            deliveryLocationSource: incoming.deliveryLocationSource || incoming.delivery_location_source || existing?.deliveryLocationSource,
            pickupPrecision: incoming.pickupPrecision || incoming.pickup_precision || existing?.pickupPrecision,
            deliveryPrecision: incoming.deliveryPrecision || incoming.delivery_precision || existing?.deliveryPrecision,
            items: incoming.items || existing?.items || '',
            status: resolvedStatus,
            createdAt: incoming.createdAt || incoming.created_at || existing?.createdAt || new Date().toISOString(),
            customerId: incoming.customerId || incoming.customer_id || existing?.customerId,
            userId: incoming.userId || existing?.userId,
            cityId: incoming.cityId || incoming.city_id || existing?.cityId || APP_CONFIG.CITY_ID,
            storeId: incoming.storeId || incoming.store_id || existing?.storeId || APP_CONFIG.STORE_ID,
            orderScope: incoming.orderScope || incoming.order_scope || existing?.orderScope || ORDER_SCOPE,
            tipAmount: incoming.tipAmount ?? incoming.tip_amount ?? existing?.tipAmount ?? 1000,
            paymentStatus:
              existing?.paymentStatus === 'paid' || existing?.paymentStatus === 'test_paid'
                ? existing.paymentStatus
                : incoming.paymentStatus || incoming.payment_status || existing?.paymentStatus || 'unpaid',
            checkoutUrl: incoming.checkoutUrl || incoming.checkout_url || existing?.checkoutUrl,
            checkoutSessionId: incoming.checkoutSessionId || incoming.checkout_session_id || existing?.checkoutSessionId,
            distanceMiles: incoming.distanceMiles ?? incoming.distance_miles ?? existing?.distanceMiles ?? 0,
            customerSessionId: incoming.customerSessionId || incoming.customer_session_id || existing?.customerSessionId,
            customer_session_id: incoming.customerSessionId || incoming.customer_session_id || existing?.customerSessionId,
            hasAlcohol: incoming.hasAlcohol ?? existing?.hasAlcohol ?? 0,
            ageVerified: incoming.ageVerified ?? incoming.age_verified ?? existing?.ageVerified,
            ageVerifiedAt: incoming.ageVerifiedAt ?? incoming.age_verified_at ?? existing?.ageVerifiedAt,
            deliveryPhotoUrl:
              incoming.deliveryPhotoUrl && (incoming.deliveryPhotoUrl.startsWith('http') || incoming.deliveryPhotoUrl.startsWith('file://'))
                ? incoming.deliveryPhotoUrl
                : existing?.deliveryPhotoUrl && (existing.deliveryPhotoUrl.startsWith('http') || existing.deliveryPhotoUrl.startsWith('file://'))
                ? existing.deliveryPhotoUrl
                : incoming.deliveryPhotoUrl || incoming.delivery_photo_url || existing?.deliveryPhotoUrl,
            delivery_photo_url:
              incoming.delivery_photo_url && (incoming.delivery_photo_url.startsWith('http') || incoming.delivery_photo_url.startsWith('file://'))
                ? incoming.delivery_photo_url
                : existing?.delivery_photo_url && (existing.delivery_photo_url.startsWith('http') || existing.delivery_photo_url.startsWith('file://'))
                ? existing.delivery_photo_url
                : incoming.deliveryPhotoUrl || incoming.delivery_photo_url || existing?.delivery_photo_url,
            deliveredAt: incoming.deliveredAt || incoming.delivered_at || existing?.deliveredAt,
            driverUserId: incoming.driverUserId || incoming.driver_user_id || existing?.driverUserId,
            driverName: incoming.driverName || incoming.driver_name || existing?.driverName,
            deliveryNotification: incoming.deliveryNotification || existing?.deliveryNotification,
          };

          finalOrder = normalized;

          if (index === -1) {
            return { orders: [normalized, ...state.orders] };
          }
          const updated = [...state.orders];
          updated[index] = { ...updated[index], ...normalized };
          return { orders: updated };
        });

        syncCustomerLocalOrders(finalOrder);
        return finalOrder;
      },

      setOrders: (orders) => set({ orders }),

      setAvailableOrders: (incomingAvailable: Order[]) => {
        set((state) => {
          const nonPending = state.orders.filter((o) => o.status !== 'pending' || !!o.driverUserId);
          const activeIds = new Set(nonPending.map((o) => o.id));
          const existingMap = new Map<string, Order>();
          state.orders.forEach((o) => o?.id && existingMap.set(o.id, o));

          const incomingMap = new Map<string, Order>();
          (incomingAvailable || []).forEach((o) => {
            if (!o?.id || activeIds.has(o.id)) return;
            const existing = existingMap.get(o.id);
            const incomingName = (o.customerName || o.customer_name || '').trim();
            const existingName = (existing?.customerName || existing?.customer_name || '').trim();
            const resolvedName =
              incomingName && incomingName !== 'Customer' && incomingName !== 'Customer Order'
                ? incomingName
                : existingName || incomingName || 'Customer';

            incomingMap.set(o.id, {
              ...(existing || {}),
              ...o,
              status: 'pending',
              customerName: resolvedName,
              customerPhone: o.customerPhone || o.customer_phone || existing?.customerPhone || '',
            });
          });

          nonPending.forEach((o) => {
            if (o?.id) {
              incomingMap.set(o.id, o);
            }
          });
          return { orders: Array.from(incomingMap.values()) };
        });
      },

      addOrder: (orderData) => {
        const newOrder: Order = {
          id: orderData.id || `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          status: orderData.status || 'pending',
          createdAt: new Date().toISOString(),
          cityId: orderData.cityId || APP_CONFIG.CITY_ID,
          storeId: orderData.storeId || APP_CONFIG.STORE_ID,
          orderScope: orderData.orderScope || ORDER_SCOPE,
          paymentStatus: 'paid',
          tipAmount: orderData.tipAmount ?? 1000,
          distanceMiles: orderData.distanceMiles ?? 3.5,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone || '(555) 000-0000',
          customerEmail: orderData.customerEmail || '',
          pickupAddress: orderData.pickupAddress,
          deliveryAddress: orderData.deliveryAddress,
          pickupLat: orderData.pickupLat,
          pickupLng: orderData.pickupLng,
          deliveryLat: orderData.deliveryLat,
          deliveryLng: orderData.deliveryLng,
          pickupPlaceId: orderData.pickupPlaceId,
          deliveryPlaceId: orderData.deliveryPlaceId,
          pickupLocationSource: orderData.pickupLocationSource,
          deliveryLocationSource: orderData.deliveryLocationSource,
          pickupPrecision: orderData.pickupPrecision,
          deliveryPrecision: orderData.deliveryPrecision,
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
