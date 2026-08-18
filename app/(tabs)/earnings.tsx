import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  AppHeader,
  Card,
  Badge,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from '@blinkdotnew/mobile-ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { blink } from '@/lib/blink';
import AdminVerificationPanel from '@/components/AdminVerificationPanel';
import AdminBGCheckPanel from '@/components/AdminBGCheckPanel';
import { useOrders } from '@/lib/orders';
import { useAuth } from '@/hooks/useAuth';
import { APP_CONFIG, ORDER_SCOPE } from '@/lib/config';
import { colors, spacing, borderRadius } from '@/constants/design';
import { useConnectStatus, useConnectPayout } from '@/lib/stripeConnect';
import { useDriverId } from '@/hooks/useDriverId';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PayoutRequest {
  id: string;
  driver_user_id: string;
  driver_name: string;
  driver_email?: string;
  amount_cents: number;
  tips_cents: number;
  deliveries_count: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  notes?: string;
  admin_note?: string;
  order_scope: string;
  requested_at: string;
  resolved_at?: string;
  payment_method?: string;
  payment_handle?: string;
}

const METHOD_LABELS: Record<string, string> = {
  stripe: 'Stripe Direct',
  bank: 'Bank Transfer',
  venmo: 'Venmo',
  cashapp: 'Cash App',
  zelle: 'Zelle',
  paypal: 'PayPal',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_COLOR: Record<string, string> = {
  pending: '$amber9',
  approved: '$blue9',
  paid: '$green9',
  rejected: '$red9',
};

// ── Hooks ──────────────────────────────────────────────────────────────────────

function usePayoutRequests(userId?: string) {
  return useQuery({
    queryKey: ['payout_requests', userId],
    enabled: !!userId,
    queryFn: async () => {
      const rows = await blink.db.payoutRequests.list({
        where: { driver_user_id: userId! },
        orderBy: { requested_at: 'desc' },
      });
      return rows as PayoutRequest[];
    },
    staleTime: 15_000,
  });
}

// ── Payout History Card ────────────────────────────────────────────────────────

function PayoutCard({ payout }: { payout: PayoutRequest }) {
  const statusColor = STATUS_COLOR[payout.status] || '$color9';
  const statusLabel = payout.status.charAt(0).toUpperCase() + payout.status.slice(1);

  return (
    <Card
      backgroundColor="$color2"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      padding="$4"
      marginBottom="$3"
    >
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <SizableText size="$5" fontWeight="800" color="$color12">{fmt(payout.amount_cents)}</SizableText>
            <Badge
              variant={payout.status === 'paid' ? 'success' : payout.status === 'rejected' ? 'error' : payout.status === 'approved' ? 'info' : 'warning'}
            >
              {statusLabel}
            </Badge>
          </XStack>
          <SizableText size="$1" color="$color9">{relativeDate(payout.requested_at)}</SizableText>
        </XStack>

        <XStack gap="$4">
          <YStack gap="$0">
            <SizableText size="$1" color="$color9" fontWeight="600">DELIVERIES</SizableText>
            <SizableText size="$2" color="$color11">{payout.deliveries_count}</SizableText>
          </YStack>
        </XStack>

        {payout.admin_note && (
          <XStack
            backgroundColor="$color3"
            borderRadius="$3"
            padding="$3"
            gap="$2"
            alignItems="flex-start"
          >
            <AlertCircle size={14} color="$color9" />
            <SizableText size="$2" color="$color10" flex={1}>{payout.admin_note}</SizableText>
          </XStack>
        )}

        {payout.status === 'paid' && payout.resolved_at && (
          <XStack gap="$1" alignItems="center">
            <CheckCircle size={13} color="$green9" />
            <SizableText size="$1" color="$green9">Paid {relativeDate(payout.resolved_at)}</SizableText>
          </XStack>
        )}
      </YStack>
    </Card>
  );
}

// ── Admin Panel ────────────────────────────────────────────────────────────────

function useAllPayoutRequests() {
  return useQuery({
    queryKey: ['all_payout_requests'],
    queryFn: async () => {
      const rows = await blink.db.payoutRequests.list({
        where: { order_scope: ORDER_SCOPE },
        orderBy: { requested_at: 'desc' },
      });
      return rows as PayoutRequest[];
    },
    staleTime: 15_000,
  });
}

function AdminPayoutPanel() {
  const { data: all = [], refetch } = useAllPayoutRequests();
  const qc = useQueryClient();
  const [resolving, setResolving] = useState<string | null>(null);

  const pending = all.filter((p) => p.status === 'pending' || p.status === 'approved');

  const resolve = async (id: string, status: 'paid' | 'rejected', adminNote?: string) => {
    setResolving(id);
    try {
      await blink.db.payoutRequests.update(id, {
        status,
        resolved_at: new Date().toISOString(),
        admin_note: adminNote,
      });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      qc.invalidateQueries({ queryKey: ['all_payout_requests'] });
      qc.invalidateQueries({ queryKey: ['payout_requests'] });
    } finally {
      setResolving(null);
    }
  };

  const confirmAction = (req: PayoutRequest, action: 'paid' | 'rejected') => {
    const methodStr = (req.payment_method && METHOD_LABELS[req.payment_method]) || req.payment_method || 'Direct Transfer';
    const label = action === 'paid' ? 'Mark as Paid' : 'Reject';
    const msg =
      action === 'paid'
        ? `Confirm you sent ${fmt(req.amount_cents)} to ${req.driver_name} via ${methodStr}${req.payment_handle ? ` (${req.payment_handle})` : ''}?`
        : `Reject payout request from ${req.driver_name}?`;

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) resolve(req.id, action);
    } else {
      Alert.alert(label, msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: label, style: action === 'rejected' ? 'destructive' : 'default', onPress: () => resolve(req.id, action) },
      ]);
    }
  };

  if (pending.length === 0) return null;

  return (
    <YStack gap="$3">
      <XStack alignItems="center" gap="$2">
        <SizableText size="$2" fontWeight="700" color="$red10">ADMIN — PAYOUT REQUESTS</SizableText>
        <YStack
          backgroundColor="$red9"
          borderRadius={999}
          width={18}
          height={18}
          alignItems="center"
          justifyContent="center"
        >
          <SizableText size="$1" color="white" fontWeight="800">{pending.length}</SizableText>
        </YStack>
      </XStack>

      {pending.map((req) => (
        <YStack
          key={req.id}
          backgroundColor="$color2"
          borderRadius="$4"
          borderWidth={1}
          borderColor="$borderColor"
          padding="$4"
          gap="$3"
        >
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack>
              <SizableText size="$4" fontWeight="700" color="$color12">{req.driver_name}</SizableText>
              <SizableText size="$2" color="$color9">{req.driver_email}</SizableText>
            </YStack>
            <SizableText size="$5" fontWeight="900" color={APP_CONFIG.PRIMARY_COLOR}>{fmt(req.amount_cents)}</SizableText>
          </XStack>

          <XStack gap="$4">
            <YStack>
              <SizableText size="$1" color="$color9" fontWeight="600">METHOD</SizableText>
              <SizableText size="$2" fontWeight="600" color="$color11">{(req.payment_method && METHOD_LABELS[req.payment_method]) || req.payment_method || 'Direct'}</SizableText>
            </YStack>
            {req.payment_handle && (
              <YStack>
                <SizableText size="$1" color="$color9" fontWeight="600">SEND TO</SizableText>
                <SizableText size="$2" fontWeight="700" color="$color12">{req.payment_handle}</SizableText>
              </YStack>
            )}
            <YStack>
              <SizableText size="$1" color="$color9" fontWeight="600">ORDERS</SizableText>
              <SizableText size="$2" color="$color11">{req.deliveries_count} deliveries</SizableText>
            </YStack>
          </XStack>

          {req.notes && (
            <SizableText size="$2" color="$color10" fontStyle="italic">"{req.notes}"</SizableText>
          )}

          <XStack gap="$2">
            <Pressable
              onPress={() => confirmAction(req, 'rejected')}
              disabled={resolving === req.id}
              style={({ pressed }) => [styles.adminBtn, styles.adminBtnReject, pressed && { opacity: 0.7 }]}
            >
              <XCircle size={14} color="$red9" />
              <SizableText size="$2" fontWeight="700" color="$red9"> Reject</SizableText>
            </Pressable>
            <Pressable
              onPress={() => confirmAction(req, 'paid')}
              disabled={resolving === req.id}
              style={({ pressed }) => [styles.adminBtn, styles.adminBtnApprove, pressed && { opacity: 0.7 }]}
            >
              {resolving === req.id ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <CheckCircle size={14} color="white" />
                  <SizableText size="$2" fontWeight="700" color="white"> Mark Paid</SizableText>
                </>
              )}
            </Pressable>
          </XStack>
        </YStack>
      ))}
    </YStack>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function EarningsScreen() {
  const { user, isAuthenticated } = useAuth();
  const driverId = useDriverId();
  const { data: orders = [], refetch: refetchOrders, isLoading: ordersLoading } = useOrders();
  const { data: payouts = [], refetch: refetchPayouts, isLoading: payoutsLoading } = usePayoutRequests(user?.id);
  const { data: connectStatus } = useConnectStatus(driverId);
  const connectPayout = useConnectPayout();
  const [refreshing, setRefreshing] = useState(false);
  const [payingOut, setPayingOut] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchOrders(), refetchPayouts()]);
    setRefreshing(false);
  }, [refetchOrders, refetchPayouts]);

  // Compute driver earnings from ALL delivered orders (not just paid)
  // Driver earnings = tip + mileage ONLY (base delivery fee goes to the business)
  const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const allEarningOrders = deliveredOrders.length > 0 ? deliveredOrders : paidOrders;

  const calcOrderDriverCents = (o: typeof orders[number]) => {
    const miles = Number(o.distanceMiles) || 0;
    const mileage = miles > APP_CONFIG.FREE_MILES
      ? Math.round((miles - APP_CONFIG.FREE_MILES) * APP_CONFIG.MILEAGE_RATE_CENTS)
      : 0;
    const tip = Number(o.tipAmount) || 0;
    return mileage + tip; // driver earnings: mileage + tip only
  };

  // Total available for payout = tip + mileage only
  const totalEarnedCents = allEarningOrders.reduce((sum, o) => sum + calcOrderDriverCents(o), 0);
  const totalTipCents = allEarningOrders.reduce((sum, o) => sum + (Number(o.tipAmount) || 0), 0);
  const totalMileageCents = allEarningOrders.reduce((sum, o) => {
    const miles = Number(o.distanceMiles) || 0;
    return sum + (miles > APP_CONFIG.FREE_MILES
      ? Math.round((miles - APP_CONFIG.FREE_MILES) * APP_CONFIG.MILEAGE_RATE_CENTS)
      : 0);
  }, 0);
  // Base fees are kept for display (not part of driver payout)
  const totalBaseFees = allEarningOrders.length * APP_CONFIG.DELIVERY_FEE_CENTS;

  // Also compute "pending payment" amounts from delivered-but-unpaid orders
  // Pending driver earnings = tip + mileage only (no base fee)
  const pendingPaymentOrders = deliveredOrders.filter((o) => o.paymentStatus !== 'paid');
  const pendingPaymentCents = pendingPaymentOrders.reduce((sum, o) => sum + calcOrderDriverCents(o), 0);

  // Subtract already-requested amounts
  const requestedCents = payouts
    .filter((p) => p.status !== 'rejected')
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const availableCents = Math.max(0, totalEarnedCents - requestedCents);

  const hasPendingRequest = payouts.some((p) => p.status === 'pending' || p.status === 'approved');

  const stripePayoutsEnabled = connectStatus?.connected && connectStatus?.payoutsEnabled;

  const handleStripePayout = async () => {
    if (!driverId || availableCents < 100) return;
    setPayingOut(true);
    try {
      await connectPayout.mutateAsync({
        driverUserId: driverId,
        amountCents: availableCents,
        description: `Driver payout — ${new Date().toLocaleDateString()} (${paidOrders.length} deliveries)`,
      });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      await refetchPayouts();
      const msg = `$${(availableCents / 100).toFixed(2)} transfer initiated — funds arrive in 1-2 business days.`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Payout Sent!', msg);
    } catch (e: any) {
      const msg = e?.message || 'Payout failed. Please try again.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setPayingOut(false);
    }
  };

  return (
    <SafeArea>
      <AppHeader title="Earnings & Payouts" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <YStack padding="$4" gap="$5">

          {/* ── Earnings Summary ── */}
          <YStack gap="$3">
            <SizableText size="$2" fontWeight="700" color="$color10">YOUR EARNINGS</SizableText>

            {/* Total card — shows all delivered earnings */}
            <YStack
              padding="$4" borderRadius="$4" alignItems="center" gap="$1"
              backgroundColor="rgba(204,0,0,0.08)" borderWidth={1} borderColor="rgba(204,0,0,0.25)"
            >
              <SizableText size="$7" fontWeight="900" color={APP_CONFIG.PRIMARY_COLOR}>
                {fmt(totalEarnedCents)}
              </SizableText>
              <SizableText size="$1" fontWeight="700" color="$color10">
                TOTAL EARNED ({allEarningOrders.length} {allEarningOrders.length === 1 ? 'delivery' : 'deliveries'})
              </SizableText>
            </YStack>

            {/* Payment status breakdown — when some are paid and some pending */}
            {deliveredOrders.length > 0 && paidOrders.length > 0 && paidOrders.length < deliveredOrders.length && (
              <XStack gap="$3">
                <YStack
                  flex={1} padding="$3" borderRadius="$4" alignItems="center" gap="$0"
                  backgroundColor="$green2" borderWidth={1} borderColor="$green4"
                >
                  <SizableText size="$4" fontWeight="800" color="$green9">{fmt(totalEarnedCents - pendingPaymentCents)}</SizableText>
                  <SizableText size="$1" fontWeight="700" color="$green10">PAID</SizableText>
                </YStack>
                <YStack
                  flex={1} padding="$3" borderRadius="$4" alignItems="center" gap="$0"
                  backgroundColor="$amber2" borderWidth={1} borderColor="$amber4"
                >
                  <SizableText size="$4" fontWeight="800" color="$amber10">{fmt(pendingPaymentCents)}</SizableText>
                  <SizableText size="$1" fontWeight="700" color="$amber9">PENDING</SizableText>
                </YStack>
              </XStack>
            )}

            {/* Breakdown — mileage + tips only (base fee is app owner revenue) */}
            <XStack gap="$3">
              <YStack
                flex={1} padding="$3" borderRadius="$4" alignItems="center" gap="$1"
                backgroundColor="$amber2" borderWidth={1} borderColor="$amber4"
              >
                <SizableText size="$5" fontWeight="800" color="$amber10">{fmt(totalMileageCents)}</SizableText>
                <SizableText size="$1" fontWeight="700" color="$amber9">MILEAGE</SizableText>
              </YStack>
              <YStack
                flex={1} padding="$3" borderRadius="$4" alignItems="center" gap="$1"
                backgroundColor="$green2" borderWidth={1} borderColor="$green4"
              >
                <SizableText size="$5" fontWeight="800" color="$green9">{fmt(totalTipCents)}</SizableText>
                <SizableText size="$1" fontWeight="700" color="$green10">TIPS</SizableText>
              </YStack>
            </XStack>

            {/* Available balance */}
            <YStack
              backgroundColor="$color2" borderRadius="$4" borderWidth={1} borderColor="$borderColor"
              padding="$4" gap="$3"
            >
              <XStack justifyContent="space-between" alignItems="center">
                <YStack>
                  <SizableText size="$3" fontWeight="700" color="$color12">Available to Request</SizableText>
                  <SizableText size="$2" color="$color9">
                    {allEarningOrders.length} {allEarningOrders.length === 1 ? 'delivery' : 'deliveries'} · {fmt(requestedCents)} already requested
                  </SizableText>
                </YStack>
                <SizableText size="$6" fontWeight="900" color={availableCents > 0 ? '$green9' : '$color10'}>
                  {fmt(availableCents)}
                </SizableText>
              </XStack>

              {!isAuthenticated ? (
                <YStack backgroundColor="$amber2" borderRadius="$3" padding="$3" borderWidth={1} borderColor="$amber4">
                  <SizableText size="$2" color="$amber10">Sign in to request a payout.</SizableText>
                </YStack>
              ) : hasPendingRequest ? (
                <YStack backgroundColor="$blue2" borderRadius="$3" padding="$3" borderWidth={1} borderColor="$blue4">
                  <SizableText size="$2" color="$blue10">
                    You have a pending payout request. You'll be notified once the admin processes it.
                  </SizableText>
                </YStack>
              ) : availableCents < 100 ? (
                <YStack backgroundColor="$color3" borderRadius="$3" padding="$3" borderWidth={1} borderColor="$color4">
                  <SizableText size="$2" color="$color9">
                    Minimum payout is $1.00. Complete more paid deliveries to request a payout.
                  </SizableText>
                </YStack>
              ) : stripePayoutsEnabled ? (
                <Pressable
                  onPress={handleStripePayout}
                  disabled={payingOut}
                  style={({ pressed }) => [styles.requestBtn, pressed && styles.requestBtnPressed, payingOut && styles.submitBtnDisabled]}
                >
                  {payingOut ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <XStack gap="$2" alignItems="center" justifyContent="center">
                      <DollarSign size={18} color="white" />
                      <SizableText size="$4" fontWeight="800" color="white">
                        Cash Out via Stripe — {fmt(availableCents)}
                      </SizableText>
                    </XStack>
                  )}
                </Pressable>
              ) : (
                <YStack backgroundColor="$color3" borderRadius="$3" padding="$3" borderWidth={1} borderColor="$color4">
                  <SizableText size="$2" color="$color9">
                    Connect your bank account in Profile to enable payouts.
                  </SizableText>
                </YStack>
              )}
            </YStack>

            {/* No request form — payouts go through Stripe only */}
          </YStack>

          {/* ── Admin: Driver verifications ── */}
          <AdminVerificationPanel />

          {/* ── Admin: Background checks ── */}
          <AdminBGCheckPanel />

          {/* ── Admin: Payout requests ── */}
          <AdminPayoutPanel />

          {/* ── Payout History ── */}
          {payouts.length > 0 && (
            <YStack gap="$3">
              <SizableText size="$2" fontWeight="700" color="$color10">PAYOUT HISTORY</SizableText>
              {payouts.map((p) => <PayoutCard key={p.id} payout={p} />)}
            </YStack>
          )}

          {payouts.length === 0 && !ordersLoading && (
            <YStack alignItems="center" padding="$6" gap="$3">
              <TrendingUp size={48} color="$color7" />
              <SizableText size="$4" fontWeight="700" color="$color10" textAlign="center">No payouts yet</SizableText>
              <SizableText size="$2" color="$color9" textAlign="center">
                Complete deliveries and request your first payout once customers pay.
              </SizableText>
            </YStack>
          )}

        </YStack>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: colors.text,
  },
  inputMultiline: {
    height: 64,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  methodBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  methodBtnActive: {
    backgroundColor: APP_CONFIG.PRIMARY_COLOR,
    borderColor: APP_CONFIG.PRIMARY_COLOR,
  },
  submitBtn: {
    height: 52,
    borderRadius: borderRadius.xl,
    backgroundColor: APP_CONFIG.PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  submitBtnDisabled: { opacity: 0.5 },
  requestBtn: {
    height: 52,
    borderRadius: borderRadius.xl,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  adminBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: 4,
  },
  adminBtnReject: {
    borderColor: colors.error,
    backgroundColor: 'transparent',
  },
  adminBtnApprove: {
    borderColor: '#16a34a',
    backgroundColor: '#16a34a',
  },
});
