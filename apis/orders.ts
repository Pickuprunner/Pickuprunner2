import { apiClient } from '@/lib/apiClient';

export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'shopping'
  | 'picked_up'
  | 'en_route'
  | 'delivered'
  | 'cancelled';

export interface CreateOrderPayload {
  id?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  items?: string;
  status?: OrderStatus;
  tipAmount?: number;
  distanceMiles?: number;
  cityId?: string;
  storeId?: string;
  orderScope?: string;
  customerSessionId?: string;
}

export interface UpdateOrderPayload {
  status?: OrderStatus;
  driverUserId?: string;
  driverName?: string;
  deliveryPhotoUrl?: string;
  ageVerified?: boolean | number;
  ageVerifiedAt?: string | Date;
  tipAmount?: number;
  distanceMiles?: number;
  pickupAddress?: string;
  deliveryAddress?: string;
  items?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

export interface ClaimOrderPayload {
  driverUserId?: string;
  driverName?: string;
}

export interface OrderItem {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  items?: string;
  status: OrderStatus;
  driverUserId?: string;
  driverName?: string;
  tipAmount?: number;
  distanceMiles?: number;
  cityId?: string;
  storeId?: string;
  orderScope?: string;
  customerSessionId?: string;
  customer_session_id?: string;
  paymentStatus?: string;
  checkoutUrl?: string;
  checkoutSessionId?: string;
  ageVerified?: boolean | number;
  ageVerifiedAt?: string;
  deliveryPhotoUrl?: string;
  deliveredAt?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type OrderResponse = OrderItem | { success?: boolean; data: OrderItem };

function unwrapOrder(res: any): OrderItem {
  const raw = res && typeof res === 'object' && res.data && res.data.id ? res.data : res;
  if (!raw || typeof raw !== 'object') return raw as OrderItem;

  return {
    ...raw,
    id: raw.id,
    customerName: raw.customerName || raw.customer_name || 'Customer',
    customerPhone: raw.customerPhone || raw.customer_phone || '',
    customerEmail: raw.customerEmail || raw.customer_email,
    pickupAddress: raw.pickupAddress || raw.pickup_address || '',
    deliveryAddress: raw.deliveryAddress || raw.delivery_address || '',
    items: raw.items || '',
    status: raw.status || 'pending',
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    driverUserId: raw.driverUserId || raw.driver_user_id,
    driverName: raw.driverName || raw.driver_name,
    tipAmount: raw.tipAmount ?? raw.tip_amount ?? raw.tipCents ?? 0,
    distanceMiles: raw.distanceMiles ?? raw.distance_miles ?? 0,
    customerSessionId: raw.customerSessionId || raw.customer_session_id,
    customer_session_id: raw.customerSessionId || raw.customer_session_id,
    paymentStatus: raw.paymentStatus || raw.payment_status,
    checkoutUrl: raw.checkoutUrl || raw.checkout_url,
    checkoutSessionId: raw.checkoutSessionId || raw.checkout_session_id,
    deliveryPhotoUrl: raw.deliveryPhotoUrl || raw.delivery_photo_url,
    deliveredAt: raw.deliveredAt || raw.delivered_at,
  };
}

export interface AvailableOrdersParams {
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  cityId?: string;
  limit?: number;
  offset?: number;
}

export interface AvailableOrdersResponse {
  total: number;
  limit: number;
  offset: number;
  sortedBy: string;
  orders: OrderItem[];
}

export const ordersApi = {
  /**
   * GET /orders/available - List open/unassigned orders for driver job board
   */
  getAvailable: async (params: AvailableOrdersParams = {}): Promise<OrderItem[]> => {
    const searchParams = new URLSearchParams();
    if (params.lat !== undefined) searchParams.append('lat', String(params.lat));
    if (params.lng !== undefined) searchParams.append('lng', String(params.lng));
    if (params.radiusMiles !== undefined) searchParams.append('radiusMiles', String(params.radiusMiles));
    if (params.cityId !== undefined) searchParams.append('cityId', params.cityId);
    if (params.limit !== undefined) searchParams.append('limit', String(params.limit));
    if (params.offset !== undefined) searchParams.append('offset', String(params.offset));

    const qs = searchParams.toString();
    const endpoint = qs ? `/orders/available?${qs}` : '/orders/available';
    const res = await apiClient.get<any>(endpoint);
    const rawList = res?.data?.orders || res?.data || (Array.isArray(res) ? res : []);
    if (Array.isArray(rawList)) {
      return rawList.map((item: any) => ({
        ...unwrapOrder(item),
        status: item.status || 'pending',
        tipAmount: item.tipAmount ?? item.tipCents ?? item.tip_amount ?? 0,
      }));
    }
    return [];
  },

  /**
   * GET /orders/mine - List orders placed by current customer or assigned to current driver
   */
  getMine: async (): Promise<OrderItem[]> => {
    const res = await apiClient.get<any>('/orders/mine');
    const rawList = res?.data?.orders || res?.data || (Array.isArray(res) ? res : []);
    if (Array.isArray(rawList)) {
      return rawList.map((item: any) => unwrapOrder(item));
    }
    return [];
  },

  create: async (payload: CreateOrderPayload): Promise<OrderItem> => {
    const res = await apiClient.post<any>('/orders', payload);
    return unwrapOrder(res);
  },

  getById: async (id: string): Promise<OrderItem> => {
    const res = await apiClient.get<any>(`/orders/${id}`);
    return unwrapOrder(res);
  },

  update: async (id: string, payload: UpdateOrderPayload): Promise<OrderItem> => {
    const res = await apiClient.patch<any>(`/orders/${id}`, payload);
    return unwrapOrder(res);
  },

  claim: async (id: string, payload: ClaimOrderPayload = {}): Promise<OrderItem> => {
    const res = await apiClient.post<any>(`/orders/${id}/claim`, payload);
    return unwrapOrder(res);
  },
};
