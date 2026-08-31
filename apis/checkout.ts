import { apiClient, resolveApiUrl } from '@/lib/apiClient';
import * as WebBrowser from 'expo-web-browser';
import { Platform, Linking } from 'react-native';

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

export const STRIPE_PAYMENT_REDIRECT_URL = 'pickuprunner://payment/success';

export async function openCheckoutUrl(url: string): Promise<boolean> {
  if (!url) return false;
  const targetUrl = resolveApiUrl(url);

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank');
    }
    return true;
  }

  try {
    const result = await WebBrowser.openAuthSessionAsync(targetUrl, STRIPE_PAYMENT_REDIRECT_URL);
    if (result.type === 'success') {
      return true;
    }
  } catch (err) {
    console.warn('[checkoutApi] openAuthSessionAsync failed, falling back to Linking:', err);
  }

  try {
    await Linking.openURL(targetUrl);
    return true;
  } catch {
    return false;
  }
}
