import { apiClient } from '@/lib/apiClient';

export interface CreateCheckoutPayload {
  orderId: string;
  amountCents?: number;
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
  splitPayment?: boolean;
  applicationFeeCents?: number;
  error?: string;
}

export const checkoutApi = {
  createCheckout: (payload: CreateCheckoutPayload) =>
    apiClient.post<CheckoutResponse>('/create-checkout', payload),

  sendPaymentLink: (payload: SendPaymentLinkPayload) =>
    apiClient.post<{ success: boolean; message: string }>('/send-payment-link', payload),
};

export async function createCheckoutForOrder(
  orderId: string,
  options: { amountCents?: number; customerEmail?: string; testMode?: boolean } = {}
): Promise<CheckoutResponse | null> {
  if (!orderId) return null;
  try {
    const payload: CreateCheckoutPayload = {
      orderId,
      testMode: options.testMode ?? true,
      ...(options.amountCents !== undefined ? { amountCents: options.amountCents } : {}),
      ...(options.customerEmail ? { customerEmail: options.customerEmail } : {}),
    };
    const res = await checkoutApi.createCheckout(payload);
    return res;
  } catch (err: any) {
    console.warn('[checkoutApi] createCheckout failed for order:', orderId, err?.message || err);
    return null;
  }
}

