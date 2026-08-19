import React, { useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  View,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Badge,
  Card,
  Zap,
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
import { useConnectStatus, useConnectPayout } from '@/lib/stripeConnect';
import { useDriverId } from '@/hooks/useDriverId';

const BLUE = '#0066FF';
const GOLD = '#F5C400';
const GREEN = '#00E676';
const BG = '#000000';
const CARD_BG = '#0F121C';

// ── SVG Icons ──────────────────────────────────────────────────────────────────

function BanknoteIcon({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="6" width="20" height="12" rx="2" />
      <Circle cx="12" cy="12" r="2" />
      <Path d="M6 12h.01M18 12h.01" />
    </Svg>
  );
}

function RouteIcon({ size = 15, color = '#8E9BAE' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="6" cy="19" r="3" />
      <Path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <Circle cx="18" cy="5" r="3" />
    </Svg>
  );
}

function SignalLiveIcon({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
      <Path d="M7.76 7.76a6 6 0 0 0 0 8.48" />
      <Circle cx="12" cy="12" r="2" fill={color} />
      <Path d="M16.24 7.76a6 6 0 0 1 0 8.48" />
      <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </Svg>
  );
}

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
  if (!iso) return 'Recent';
  const date = new Date(iso);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `Today, ${timeStr}`;
  } else if (diffHours < 48) {
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `Yesterday, ${timeStr}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getWeekRangeString() {
  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const optMonth: Intl.DateTimeFormatOptions = { month: 'short' };
  const mStr = monday.toLocaleDateString('en-US', optMonth);
  const sStr = sunday.toLocaleDateString('en-US', optMonth);

  if (mStr === sStr) {
    return `${mStr} ${monday.getDate()} - ${sunday.getDate()}`;
  }
  return `${mStr} ${monday.getDate()} - ${sStr} ${sunday.getDate()}`;
}

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

// ── Admin Panel ────────────────────────────────────────────────────────────────

function AdminPayoutPanel() {
  const { data: all = [] } = useAllPayoutRequests();
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
    <YStack gap="$3" marginTop="$4">
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
          backgroundColor={CARD_BG}
          borderRadius="$4"
          borderWidth={1}
          borderColor="rgba(255,255,255,0.08)"
          padding="$4"
          gap="$3"
        >
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack>
              <SizableText size="$4" fontWeight="700" color="white">{req.driver_name}</SizableText>
              <SizableText size="$2" color="$color9">{req.driver_email}</SizableText>
            </YStack>
            <SizableText size="$5" fontWeight="900" color={GOLD}>{fmt(req.amount_cents)}</SizableText>
          </XStack>

          <XStack gap="$4">
            <YStack>
              <SizableText size="$1" color="$color9" fontWeight="600">METHOD</SizableText>
              <SizableText size="$2" fontWeight="600" color="white">{(req.payment_method && METHOD_LABELS[req.payment_method]) || req.payment_method || 'Direct'}</SizableText>
            </YStack>
            {req.payment_handle && (
              <YStack>
                <SizableText size="$1" color="$color9" fontWeight="600">SEND TO</SizableText>
                <SizableText size="$2" fontWeight="700" color="white">{req.payment_handle}</SizableText>
              </YStack>
            )}
            <YStack>
              <SizableText size="$1" color="$color9" fontWeight="600">ORDERS</SizableText>
              <SizableText size="$2" color="white">{req.deliveries_count} deliveries</SizableText>
            </YStack>
          </XStack>

          {req.notes && (
            <SizableText size="$2" color="$color10" fontStyle="italic">"{req.notes}"</SizableText>
          )}

          <XStack gap="$2" marginTop="$2">
            <Pressable
              onPress={() => confirmAction(req, 'rejected')}
              disabled={resolving === req.id}
              style={({ pressed }) => [styles.adminBtn, styles.adminBtnReject, pressed && { opacity: 0.7 }]}
            >
              <XCircle size={14} color="#EF4444" />
              <SizableText size="$2" fontWeight="700" color="#EF4444"> Reject</SizableText>
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

  // Compute driver earnings from delivered orders
  const deliveredOrders = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders]);
  const paidOrders = useMemo(() => orders.filter((o) => o.paymentStatus === 'paid'), [orders]);
  const allEarningOrders = deliveredOrders.length > 0 ? deliveredOrders : paidOrders;

  const calcOrderDriverCents = useCallback((o: typeof orders[number]) => {
    const miles = Number(o.distanceMiles) || 0;
    const mileage = miles > APP_CONFIG.FREE_MILES
      ? Math.round((miles - APP_CONFIG.FREE_MILES) * APP_CONFIG.MILEAGE_RATE_CENTS)
      : 0;
    const tip = Number(o.tipAmount) || 0;
    return mileage + tip;
  }, []);

  const totalEarnedCents = useMemo(() => {
    return allEarningOrders.reduce((sum, o) => sum + calcOrderDriverCents(o), 0);
  }, [allEarningOrders, calcOrderDriverCents]);

  const totalMiles = useMemo(() => {
    return allEarningOrders.reduce((sum, o) => sum + (Number(o.distanceMiles) || 0), 0);
  }, [allEarningOrders]);

  // Subtract already-requested amounts
  const requestedCents = useMemo(() => {
    return payouts
      .filter((p) => p.status !== 'rejected')
      .reduce((sum, p) => sum + p.amount_cents, 0);
  }, [payouts]);

  const availableCents = Math.max(0, totalEarnedCents - requestedCents);

  // Active time approximate calculation (e.g. ~25 mins per delivery or total hours)
  const activeHours = Math.floor((allEarningOrders.length * 28) / 60);
  const activeMinutes = (allEarningOrders.length * 28) % 60;

  const stripePayoutsEnabled = connectStatus?.connected && connectStatus?.payoutsEnabled;

  const handleInstantPayout = async () => {
    if (availableCents < 100) {
      const msg = 'Minimum payout balance is $1.00. Complete deliveries to accumulate balance.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Insufficient Balance', msg);
      return;
    }

    if (!driverId) {
      Alert.alert('Authentication required', 'Please sign in to cash out.');
      return;
    }

    setPayingOut(true);
    try {
      if (stripePayoutsEnabled) {
        await connectPayout.mutateAsync({
          driverUserId: driverId,
          amountCents: availableCents,
          description: `Instant payout — ${new Date().toLocaleDateString()} (${allEarningOrders.length} deliveries)`,
        });
      } else {
        // Create a standard direct payout request
        await blink.db.payoutRequests.create({
          driver_user_id: driverId,
          driver_name: user?.displayName || user?.email || 'Driver',
          driver_email: user?.email || '',
          amount_cents: availableCents,
          tips_cents: 0,
          deliveries_count: allEarningOrders.length,
          status: 'pending',
          order_scope: ORDER_SCOPE,
          requested_at: new Date().toISOString(),
          payment_method: 'direct',
        });
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      await refetchPayouts();
      const msg = `$${(availableCents / 100).toFixed(2)} payout initiated! Funds will be transferred shortly.`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Payout Initiated! 🚀', msg);
    } catch (e: any) {
      const msg = e?.message || 'Payout failed. Please try again.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setPayingOut(false);
    }
  };

  const weekRange = useMemo(() => getWeekRangeString(), []);

  return (
    <SafeArea>
      <View style={styles.root}>
        {/* Top App Header */}
        <View style={styles.topAppHeader}>
          <View style={styles.brandRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user?.displayName || user?.email || 'PR').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.brandTitle}>{APP_CONFIG.APP_NAME}</Text>
          </View>

          <View style={styles.signalWrap}>
            <SignalLiveIcon size={18} color="rgba(255,255,255,0.7)" />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        >
          {/* Title and Week Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>Earnings</Text>

            <View style={styles.weekRow}>
              <Text style={styles.weekText}>This Week: {weekRange}</Text>
              <View style={styles.verifiedBadge}>
                <View style={styles.verifiedDot} />
                <Text style={styles.verifiedText}>Account Verified</Text>
              </View>
            </View>
          </View>

          {/* Hero Available Balance Card */}
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={['#181C28', '#121520', '#0C0E16']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.balanceCardGradient}
            >
              <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.balanceAmount}>
                ${(availableCents / 100).toFixed(2)}
              </Text>

              <Pressable
                onPress={handleInstantPayout}
                disabled={payingOut}
                style={({ pressed }) => [
                  styles.payoutButton,
                  pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                  availableCents < 100 && { opacity: 0.65 },
                ]}
              >
                {payingOut ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <BanknoteIcon size={18} color="white" />
                    <Text style={styles.payoutButtonText}>Instant Payout</Text>
                  </>
                )}
              </Pressable>
            </LinearGradient>
          </View>

          {/* Stats Row (2 Cards) */}
          <View style={styles.statsRow}>
            {/* Total Miles */}
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#181C28', '#121520', '#0C0E16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.statCardGradient}
              >
                <View style={styles.statHeader}>
                  <RouteIcon size={14} color="#8E9BAE" />
                  <Text style={styles.statLabel}>Total Miles</Text>
                </View>
                <Text style={styles.statValue}>
                  {totalMiles > 0 ? `${totalMiles.toFixed(1)} mi` : '0.0 mi'}
                </Text>
              </LinearGradient>
            </View>

            {/* Active Time */}
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#181C28', '#121520', '#0C0E16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.statCardGradient}
              >
                <View style={styles.statHeader}>
                  <Clock size={14} color="#8E9BAE" />
                  <Text style={styles.statLabel}>Active Time</Text>
                </View>
                <Text style={styles.statValue}>
                  {allEarningOrders.length > 0 ? `${activeHours}h ${activeMinutes}m` : '0h 00m'}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Recent Deliveries List */}
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Recent Deliveries</Text>

            {allEarningOrders.length > 0 ? (
              allEarningOrders.slice(0, 10).map((order) => {
                const shortId = order.id ? order.id.slice(-4).toUpperCase() : '----';
                const miles = Number(order.distanceMiles) || 0;
                const tip = Number(order.tipAmount) || 0;
                const driverEarned = calcOrderDriverCents(order);
                const dateStr = relativeDate(order.createdAt || '');

                return (
                  <View key={order.id} style={styles.deliveryCard}>
                    <LinearGradient
                      colors={['#181C28', '#121520', '#0C0E16']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={styles.deliveryCardGradient}
                    >
                      <View style={styles.deliveryLeft}>
                        <View style={styles.deliveryIconWrap}>
                          <Package size={18} color="#C4CBD5" />
                        </View>
                        <View style={styles.deliveryMeta}>
                          <Text style={styles.deliveryId} numberOfLines={1} ellipsizeMode="tail">
                            Order #{shortId}
                          </Text>
                          <Text style={styles.deliverySub} numberOfLines={1} ellipsizeMode="tail">
                            {dateStr} • {miles > 0 ? `${miles.toFixed(1)} mi` : 'Local'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.deliveryRight}>
                        <Text style={styles.deliveryAmount} numberOfLines={1}>
                          ${(driverEarned / 100).toFixed(2)}
                        </Text>
                        <Text style={styles.deliveryTip} numberOfLines={1}>
                          {tip > 0 ? `Incl. $${(tip / 100).toFixed(0)} tip` : 'Delivered ✓'}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <Package size={36} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyTitle}>No Deliveries Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Completed customer deliveries and tips will appear here automatically.
                </Text>
              </View>
            )}
          </View>

          {/* Admin Verification & Payout Management (Only for Admins) */}
          <AdminVerificationPanel />
          <AdminBGCheckPanel />
          <AdminPayoutPanel />
        </ScrollView>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  /* Top App Header */
  topAppHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E2433',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  signalWrap: {
    padding: 4,
  },

  /* Title Section */
  titleSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  weekText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  verifiedText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '700',
  },

  /* Balance Card */
  balanceCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  balanceCardGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  balanceLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: -1,
    marginBottom: 20,
  },
  payoutButton: {
    backgroundColor: BLUE,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  payoutButtonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardGradient: {
    padding: 16,
    width: '100%',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    color: '#8E9BAE',
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  /* Recent Deliveries */
  recentSection: {
    marginBottom: 20,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  deliveryCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  deliveryCardGradient: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  deliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
    overflow: 'hidden',
  },
  deliveryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryMeta: {
    flex: 1,
    overflow: 'hidden',
  },
  deliveryId: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  deliverySub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  deliveryRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    minWidth: 70,
  },
  deliveryAmount: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '900',
    textAlign: 'right',
  },
  deliveryTip: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'right',
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Admin Buttons */
  adminBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 4,
  },
  adminBtnReject: {
    borderColor: '#EF4444',
    backgroundColor: 'transparent',
  },
  adminBtnApprove: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },
});

