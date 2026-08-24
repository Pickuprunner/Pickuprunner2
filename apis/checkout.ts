import { apiClient } from '@/lib/apiClient';

export interface CreateCheckoutPayload {
  orderId: string;
  amountCents: number;
  customerEmail?: string;
  testMode?: boolean;
}

export interface SendPaymentLinkPayload {
  orderId: string;
  amountCents: number;
  customerEmail: string;
  testMode?: boolean;
}

export interface CheckoutResponse {
  success?: boolean;
  url?: string;
  clientSecret?: string;
  sessionId?: string;
  paymentIntentId?: string;
}

export const checkoutApi = {
  createCheckout: (payload: CreateCheckoutPayload) =>
    apiClient.post<CheckoutResponse>('/create-checkout', payload),

  sendPaymentLink: (payload: SendPaymentLinkPayload) =>
    apiClient.post<{ success: boolean; message: string }>('/send-payment-link', payload),
};
