/**
 * Stripe Connect mock helpers for static UI rendering.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
      return {
        connected: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        stripeAccountId: 'acct_static_driver_101',
      };
    },
  });
}

export function useConnectOnboard() {
  return useMutation({
    mutationFn: async ({ driverUserId, driverEmail }: { driverUserId: string; driverEmail?: string }) => {
      console.log('[Stripe Connect Mock] Onboarding initiated for:', driverUserId, driverEmail);
      return {
        url: 'https://connect.stripe.com/express/oauth/static_demo',
        stripeAccountId: 'acct_static_driver_101',
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
      console.log('[Stripe Connect Mock] Payout triggered:', driverUserId, amountCents, description);
      return {
        success: true,
        transferId: `tr_static_${Date.now()}`,
        amount: amountCents,
      };
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, driverUserId }: { orderId: string; driverUserId: string }) => {
      console.log('[Stripe Connect Mock] Transfer on accept:', orderId, driverUserId);
      return {
        success: true,
        transferId: `tr_static_${Date.now()}`,
        driverEarningsCents: 1500,
        mileageCents: 500,
        tipCents: 1000,
      };
    },
  });
}
