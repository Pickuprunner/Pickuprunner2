/**
 * Stripe Connect helpers for driver bank account onboarding and payouts.
 * All calls go through the Blink Backend at vljh4v3j.backend.blink.new
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BACKEND = 'https://vljh4v3j.backend.blink.new';
const RETURN_URL = 'https://pickup-runner-app-vljh4v3j.blinkpowered.com';

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
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch(`${BACKEND}/connect/status?driverUserId=${encodeURIComponent(driverUserId!)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch connect status');
      return data as ConnectStatus;
    },
  });
}

export function useConnectOnboard() {
  return useMutation({
    mutationFn: async ({ driverUserId, driverEmail }: { driverUserId: string; driverEmail?: string }) => {
      const res = await fetch(`${BACKEND}/connect/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverUserId,
          driverEmail,
          returnUrl: RETURN_URL,
          refreshUrl: RETURN_URL,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start onboarding');
      return data as { url: string; stripeAccountId: string };
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
      const res = await fetch(`${BACKEND}/connect/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverUserId, amountCents, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payout failed');
      return data as { success: boolean; transferId: string; amount: number };
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

/** Transfer driver earnings (mileage + tip) when accepting a paid order. Idempotent. */
export function useTransferOnAccept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, driverUserId }: { orderId: string; driverUserId: string }) => {
      const res = await fetch(`${BACKEND}/connect/transfer-earnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, driverUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');
      return data as TransferResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
