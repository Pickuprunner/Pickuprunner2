import React, { useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  Alert,
  View,
  Text,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { blink } from '@/lib/blink';
import { useOrders } from '@/lib/orders';
import { useAuth } from '@/hooks/useAuth';
import { APP_CONFIG, ORDER_SCOPE } from '@/lib/config';
import { useConnectStatus, useConnectPayout } from '@/lib/stripeConnect';
import { useDriverId } from '@/hooks/useDriverId';
import { CustomHeader, useToast, CustomLoading, CustomRefreshControl } from '@/components/core';
import { colors } from '@/constants/design';

import {
  EarningsHeroCard,
  EarningsStatsRow,
  EarningsDeliveriesList,
} from '@/components/earnings';

const BG = colors.background;
const GOLD = colors.secondaryContainer;
const GREEN = colors.tertiary;

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

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user } = useAuth();
  const driverId = useDriverId();
  const { data: orders = [], refetch: refetchOrders } = useOrders();
  const { data: payouts = [], refetch: refetchPayouts } = usePayoutRequests(user?.id);
  const { data: connectStatus } = useConnectStatus(driverId);
  const connectPayout = useConnectPayout();
  const [refreshing, setRefreshing] = useState(false);
  const [payingOut, setPayingOut] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchOrders(), refetchPayouts()]);
    setRefreshing(false);
  }, [refetchOrders, refetchPayouts]);

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

  const requestedCents = useMemo(() => {
    return payouts
      .filter((p) => p.status !== 'rejected')
      .reduce((sum, p) => sum + p.amount_cents, 0);
  }, [payouts]);

  const availableCents = Math.max(0, totalEarnedCents - requestedCents);

  const activeHours = Math.floor((allEarningOrders.length * 28) / 60);
  const activeMinutes = (allEarningOrders.length * 28) % 60;

  const stripePayoutsEnabled = connectStatus?.connected && connectStatus?.payoutsEnabled;

  const handleInstantPayout = async () => {
    if (availableCents < 100) {
      const msg = 'Minimum payout balance is $1.00. Complete deliveries to accumulate balance.';
      showToast('Minimum payout balance is $1.00', { type: 'warning' });
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Insufficient Balance', msg);
      }
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
      await refetchPayouts();
      showToast(`$${(availableCents / 100).toFixed(2)} payout initiated!`, { type: 'success' });
    } catch (e: any) {
      const msg = e?.message || 'Payout failed. Please try again.';
      showToast(msg, { type: 'error' });
    } finally {
      setPayingOut(false);
    }
  };

  const weekRange = useMemo(() => getWeekRangeString(), []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <CustomHeader
        title="Earnings"
        showAvatar={false}
        pills={
          <View style={styles.headerSubRow}>
            <Text style={styles.weekText}>This Week: {weekRange}</Text>
            <View style={styles.verifiedPill}>
              <View style={styles.verifiedDot} />
              <Text style={styles.verifiedPillText}>Account Verified</Text>
            </View>
          </View>
        }
        borderBottom
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <EarningsHeroCard
          availableCents={availableCents}
          payingOut={payingOut}
          onInstantPayout={handleInstantPayout}
        />

        <EarningsStatsRow
          totalMiles={totalMiles}
          activeHours={activeHours}
          activeMinutes={activeMinutes}
          hasOrders={allEarningOrders.length > 0}
        />

        <EarningsDeliveriesList
          orders={allEarningOrders}
          calcOrderDriverCents={calcOrderDriverCents}
          relativeDate={relativeDate}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  weekText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13.5,
    fontWeight: '600',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
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
  verifiedPillText: {
    color: GREEN,
    fontSize: 11.5,
    fontWeight: '700',
  },
});
