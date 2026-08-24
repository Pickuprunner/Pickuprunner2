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
  tipAmount?: number; // Integer cents (e.g. 500 = $5.00)
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
  tipAmount?: number; // Integer cents
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
  paymentStatus?: string;
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
  // Snake_case aliases returned from backend serialization
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

export type OrderResponse = OrderItem | { success?: boolean; data: OrderItem };

function unwrapOrder(res: any): OrderItem {
  if (res && typeof res === 'object' && res.data && res.data.id) {
    return res.data;
  }
  return res as OrderItem;
}

export const ordersApi = {
  /**
   * POST /orders - Create a new order
   */
  create: async (payload: CreateOrderPayload): Promise<OrderItem> => {
    const res = await apiClient.post<any>('/orders', payload);
    return unwrapOrder(res);
  },

  /**
   * GET /orders/:id - Read an order by ID
   */
  getById: async (id: string): Promise<OrderItem> => {
    const res = await apiClient.get<any>(`/orders/${id}`);
    return unwrapOrder(res);
  },

  /**
   * PATCH /orders/:id - Update order fields or lifecycle status
   */
  update: async (id: string, payload: UpdateOrderPayload): Promise<OrderItem> => {
    const res = await apiClient.patch<any>(`/orders/${id}`, payload);
    return unwrapOrder(res);
  },

  /**
   * POST /orders/:id/claim - Claim an available order as driver
   */
  claim: async (id: string, payload: ClaimOrderPayload = {}): Promise<OrderItem> => {
    const res = await apiClient.post<any>(`/orders/${id}/claim`, payload);
    return unwrapOrder(res);
  },
};
