import { apiClient } from '@/lib/apiClient';

export interface ConnectAccountResponse {
  success?: boolean;
  stripeAccountId?: string;
  url?: string;
  message?: string;
  data?: {
    stripeAccountId?: string;
    url?: string;
    accountLink?: string;
  };
}

export interface ConnectOnboardResponse {
  url?: string;
  success?: boolean;
  message?: string;
  stripeAccountId?: string;
  data?: {
    url?: string;
    accountLink?: string;
    stripeAccountId?: string;
  };
}

export interface ConnectStatusResponse {
  connected: boolean;
  payoutsEnabled: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
  stripeAccountId?: string | null;
  data?: {
    connected: boolean;
    payoutsEnabled: boolean;
    chargesEnabled?: boolean;
    detailsSubmitted?: boolean;
    stripeAccountId?: string | null;
  };
}

export interface BalanceResponse {
  available: number;
  pending: number;
  currency: string;
  data?: {
    available: number;
    pending: number;
    currency: string;
  };
}

export const connectApi = {
  autoCreateAccount: (payload?: { driverEmail?: string; driverUserId?: string; driverPhone?: string }) =>
    apiClient.post<ConnectAccountResponse>('/connect/auto-create', payload),

  createOnboardingLink: (payload?: {
    driverUserId?: string;
    stripeAccountId?: string;
    returnUrl?: string;
    refreshUrl?: string;
  }) =>
    apiClient.post<ConnectOnboardResponse>('/connect/onboard', payload),

  getStatus: () =>
    apiClient.get<ConnectStatusResponse>('/connect/status'),

  getBalance: (stripeAccountId: string) =>
    apiClient.get<BalanceResponse>(`/connect/balance?stripeAccountId=${encodeURIComponent(stripeAccountId)}`),

  transferEarnings: (orderId: string) =>
    apiClient.post<{ success: boolean; transferId: string }>('/connect/transfer-earnings', { orderId }),

  payout: (payload: { driverUserId: string; amountCents: number; idempotencyKey?: string }) =>
    apiClient.post<{ success: boolean; payoutId: string }>('/connect/payout', payload),

  manualPayout: (payload: { stripeAccountId: string; amountCents: number }) =>
    apiClient.post<{ success: boolean; payoutId: string }>('/connect/manual-payout', payload),
};
