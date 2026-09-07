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
    const errorMsg = err?.response?.data?.message || err?.message || 'Could not create checkout session';
    console.warn('[checkoutApi] createCheckout failed for order:', orderId, errorMsg);
    return { success: false, error: errorMsg };
  }
}

WebBrowser.maybeCompleteAuthSession();

export const STRIPE_PAYMENT_REDIRECT_URL = 'pickuprunner://payment/success';

export async function openCheckoutUrl(url: string, orderId?: string): Promise<boolean> {
  if (!url) return false;
  const targetUrl = resolveApiUrl(url);

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank');
    }
    return true;
  }

  return new Promise<boolean>(async (resolve) => {
    let resolved = false;

    const cleanupAndResolve = (success: boolean) => {
      if (resolved) return;
      resolved = true;
      try {
        linkSubscription.remove();
      } catch {}
      try {
        WebBrowser.dismissAuthSession();
      } catch {}
      resolve(success);
    };

    const linkSubscription = Linking.addEventListener('url', (event) => {
      const incomingUrl = event?.url || '';
      if (incomingUrl.includes('payment/success')) {
        cleanupAndResolve(true);
      } else if (incomingUrl.includes('payment/cancelled')) {
        cleanupAndResolve(false);
      }
    });

    try {
      const result = await WebBrowser.openAuthSessionAsync(targetUrl, STRIPE_PAYMENT_REDIRECT_URL, {
        showInRecents: true,
      });
      if (!resolved) {
        if (result.type === 'success') {
          const returnUrl = (result as any)?.url || '';
          cleanupAndResolve(!returnUrl.includes('payment/cancelled'));
        } else {
          // Fallback for Android Chrome Custom Tabs when dismissed or closed
          if (orderId) {
            try {
              const res = await apiClient.get<any>(`/orders/${orderId}`);
              const order = res?.data || res;
              if (order?.paymentStatus === 'paid' || order?.payment_status === 'paid') {
                return cleanupAndResolve(true);
              }
            } catch {}
          }
          cleanupAndResolve(false);
        }
      }
    } catch (err) {
      console.warn('[checkoutApi] openAuthSessionAsync failed:', err);
      if (!resolved) {
        cleanupAndResolve(false);
      }
    }
  });
}
