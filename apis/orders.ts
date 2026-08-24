import { apiClient } from '@/lib/apiClient';

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  items?: string;
  tipAmount?: number;
  distanceMiles?: number;
  orderScope?: string;
  notes?: string;
}

export interface UpdateOrderPayload {
  status?: 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
  driverUserId?: string;
  driverName?: string;
  ageVerified?: number;
  ageVerifiedAt?: string;
  deliveryPhotoUrl?: string;
  tipAmount?: number;
  distanceMiles?: number;
  items?: string;
  notes?: string;
}

export interface ClaimOrderPayload {
  driverUserId?: string;
  driverName?: string;
}

export interface OrderItem {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  items?: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
  driverUserId?: string;
  driverName?: string;
  tipAmount?: number;
  distanceMiles?: number;
  orderScope?: string;
  ageVerified?: number;
  ageVerifiedAt?: string;
  deliveryPhotoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderResponse {
  success?: boolean;
  data: OrderItem;
}

export const ordersApi = {
  create: (payload: CreateOrderPayload) =>
    apiClient.post<OrderResponse>('/orders', payload),

  getById: (id: string) =>
    apiClient.get<OrderResponse>(`/orders/${id}`),

  claim: (id: string, payload: ClaimOrderPayload = {}) =>
    apiClient.post<OrderResponse>(`/orders/${id}/claim`, payload),

  update: (id: string, payload: UpdateOrderPayload) =>
    apiClient.patch<OrderResponse>(`/orders/${id}`, payload),
};
