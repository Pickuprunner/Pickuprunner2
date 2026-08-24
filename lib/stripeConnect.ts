import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectApi } from '@/apis/connect';
import { getApiBaseUrl, resolveApiUrl } from '@/lib/apiClient';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export const STRIPE_REDIRECT_URL = 'pickuprunner://connect/onboarding/success';

export async function openStripeOnboardingSession(url: string): Promise<boolean> {
  if (!url) return false;
  const targetUrl = resolveApiUrl(url);

  if (Platform.OS === 'web') {
    window.open(targetUrl, '_blank');
    return true;
  }

  try {
    const result = await WebBrowser.openAuthSessionAsync(targetUrl, STRIPE_REDIRECT_URL);
    if (result.type === 'success') {
      return true;
    }
  } catch (err) {
    console.warn('[StripeConnect] openAuthSessionAsync failed, falling back to openBrowserAsync:', err);
    await WebBrowser.openBrowserAsync(targetUrl);
  }

  return false;
}

export interface ConnectStatus {
  connected: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  stripeAccountId: string | null;
}

export function useConnectStatus(driverUserId?: string) {
  return useQuery<ConnectStatus>({
    queryKey: ['stripe_connect_status', driverUserId],
    enabled: !!driverUserId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      try {
        const res = await connectApi.getStatus();
        const data = (res as any)?.data || res;
        const stripeAccountId = data?.stripeAccountId || null;
        const payoutsEnabled = Boolean(data?.payoutsEnabled);
        const detailsSubmitted = Boolean(data?.detailsSubmitted ?? (data?.connected || payoutsEnabled));
        const connected = Boolean(data?.connected ?? (payoutsEnabled || Boolean(stripeAccountId)));

        return {
          connected,
          payoutsEnabled,
          detailsSubmitted,
          stripeAccountId,
        };
      } catch (err) {
        console.warn('[StripeConnect] Failed to get connect status:', err);
        return {
          connected: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          stripeAccountId: null,
        };
      }
    },
  });
}

export function useConnectOnboard() {
  return useMutation({
    mutationFn: async ({ driverUserId, driverEmail }: { driverUserId?: string; driverEmail?: string }) => {
      const apiBase = getApiBaseUrl();
      const returnUrl = `${apiBase}/connect/onboarding/success`;
      const refreshUrl = `${apiBase}/connect/onboarding/reauth`;
      try {
        const res = await connectApi.createOnboardingLink({ returnUrl, refreshUrl });
        const rawUrl = res?.url || res?.data?.url || (res as any)?.data?.accountLink;
        if (rawUrl) {
          return {
            url: resolveApiUrl(rawUrl),
            stripeAccountId: res?.stripeAccountId || res?.data?.stripeAccountId || null,
          };
        }
      } catch (err: any) {
        console.log('[StripeConnect] First attempt createOnboardingLink failed, auto-creating account:', err?.message);
      }

      const autoRes = await connectApi.autoCreateAccount({ driverEmail, driverUserId });
      let rawUrl = autoRes?.url || autoRes?.data?.url || (autoRes as any)?.data?.accountLink;

      if (!rawUrl) {
        try {
          const res2 = await connectApi.createOnboardingLink({ returnUrl, refreshUrl });
          rawUrl = res2?.url || res2?.data?.url || (res2 as any)?.data?.accountLink;
        } catch (err2: any) {
          console.warn('[StripeConnect] Second attempt createOnboardingLink failed:', err2?.message);
        }
      }

      if (!rawUrl) {
        throw new Error(autoRes?.message || 'Could not generate Stripe onboarding link. Please try again.');
      }

      return {
        url: resolveApiUrl(rawUrl),
        stripeAccountId: autoRes?.stripeAccountId || autoRes?.data?.stripeAccountId || null,
      };
    },
  });
}

export function useConnectPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      driverUserId,
      amountCents,
      description,
    }: {
      driverUserId: string;
      amountCents: number;
      description?: string;
    }) => {
      const res = await connectApi.payout({ driverUserId, amountCents });
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['stripe_connect_status', vars.driverUserId] });
      qc.invalidateQueries({ queryKey: ['payout_requests'] });
    },
  });
}

export interface TransferResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  transferId?: string;
  driverEarningsCents?: number;
  mileageCents?: number;
  tipCents?: number;
}

export function useTransferOnAccept() {
  return useMutation({
    mutationFn: async ({ orderId, driverUserId }: { orderId: string; driverUserId: string }) => {
      try {
        const res = await connectApi.transferEarnings(orderId);
        return res;
      } catch (err: any) {
        console.warn('[StripeConnect] transferEarnings failed:', err?.message);
        return {
          success: false,
          reason: err?.message,
        };
      }
    },
  });
}
