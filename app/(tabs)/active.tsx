/**
 * My Active Orders — driver's accepted/in-progress orders.
 * Premium Dark Obsidian theme matching Orders & Earnings design.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Platform,
  StyleSheet,
  View,
  Text,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  YStack,
  SizableText,
  Button,
  SafeArea,
  Package,
  Navigation,
  CheckCircle,
  Truck,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useOrders, useUpdateOrderStatus, Order } from '@/lib/orders';
import { useOrdersRealtime } from '@/lib/realtime';
import { useDriverId } from '@/hooks/useDriverId';
import { useAuth } from '@/hooks/useAuth';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { calcDriverEarnings, APP_CONFIG } from '@/lib/config';

const BLUE = '#0066FF';
const GOLD = '#F5C400';
const GREEN = '#00E676';
const CYAN = '#38BDF8';
const BG = '#000000';
const CARD_BG = '#0F121C';

function haptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

function openNav(address: string) {
  if (!address) return;
  const encoded = encodeURIComponent(address);
  const url = Platform.OS === 'ios'
    ? `maps://?daddr=${encoded}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  Linking.openURL(url);
}

function getGreeting(name?: string) {
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const driverName = name ? name.split(' ')[0].toUpperCase() : 'DRIVER';
  return `${timeGreeting}, ${driverName}`;
}

// ── Active / Available Order Card ────────────────────────────────────────────

function ActiveOrderCard({
  order,
  isAvailable = false,
  driverUserId,
  driverDisplayName,
}: {
  order: Order;
  isAvailable?: boolean;
  driverUserId?: string;
  driverDisplayName?: string;
}) {
  const updateStatus = useUpdateOrderStatus();
  const { status } = order;
  const miles = Number(order.distanceMiles ?? 0);
  const earnings = calcDriverEarnings(miles, Number(order.tipAmount ?? 0));
  const isMeetCustomer = !!(order.items?.includes('[MEET CUSTOMER]'));
  const isPending = updateStatus.isPending;

  // Approx estimated drive time (~3.5 mins per mile + 4 mins base)
  const estMins = Math.max(5, Math.round(miles * 3.5 + 4));

  const handleAction = async () => {
    haptic();
    if (isAvailable || status === 'pending') {
      const uid = driverUserId || `guest-${Date.now()}`;
      const uname = driverDisplayName || 'Driver';
      await updateStatus.mutateAsync({
        id: order.id,
        status: 'accepted',
        driverUserId: uid,
        driverName: uname,
      });
    } else if (status === 'accepted') {
      updateStatus.mutate({ id: order.id, status: 'picked_up' });
    } else if (status === 'picked_up') {
      setSelectedOrder(order);
      router.push(`/order/${order.id}`);
    }
  };

  const navAddress = status === 'accepted' ? order.pickupAddress : order.deliveryAddress;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#181C28', '#121520', '#0C0E16']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Top Earnings & Distance Row */}
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.cardAmount}>${earnings.totalDisplay}</Text>
            <Text style={styles.cardSublabel}>EST. EARNINGS</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardMiles}>{miles > 0 ? `${miles.toFixed(1)} mi` : 'Local'}</Text>
            <Text style={styles.cardTime}>~{estMins} MIN</Text>
          </View>
        </View>

        {/* Route Timeline (Pickup & Dropoff) */}
        <View style={styles.timeline}>
          {/* Pickup Step */}
          <View style={styles.timelineStep}>
            <View style={styles.stepIndicatorCol}>
              <View style={[styles.timelineDot, { backgroundColor: CYAN }]} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepLabel, { color: CYAN }]}>PICKUP</Text>
              <Text style={styles.stepAddress} numberOfLines={2}>
                {order.pickupAddress || 'Store / Pickup Location'}
              </Text>
            </View>
          </View>

          {/* Dropoff Step */}
          <View style={styles.timelineStep}>
            <View style={styles.stepIndicatorCol}>
              <View style={[styles.timelineDot, { backgroundColor: BLUE }]} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepLabel, { color: '#60A5FA' }]}>DROPOFF</Text>
              <Text style={styles.stepAddress} numberOfLines={2}>
                {order.deliveryAddress || 'Customer Address'}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer & Phone details */}
        {!!order.customerName && (
          <View style={styles.customerRow}>
            <Text style={styles.customerName}>Customer: {order.customerName}</Text>
            {!!order.customerPhone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
                hitSlop={8}
              >
                <Text style={styles.phoneLink}>📞 {order.customerPhone}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Bottom Actions Row */}
        <View style={styles.cardBottomRow}>
          {/* Tip Pill */}
          <View style={styles.tipPill}>
            <Text style={styles.tipPillText}>
              {earnings.tipCents > 0
                ? `INCLUDES +$${(earnings.tipCents / 100).toFixed(2)} TIP`
                : 'BASE + MILEAGE'}
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            {/* Map button (Only for accepted/in-progress orders) */}
            {!isAvailable && status !== 'pending' && (
              <Button
                size="$3"
                onPress={() => {
                  haptic();
                  openNav(navAddress ?? '');
                }}
                backgroundColor="rgba(255,255,255,0.06)"
                borderColor="rgba(255,255,255,0.15)"
                borderWidth={1}
                color="#FFFFFF"
                icon={<Navigation size={12} color="#93C5FD" />}
                borderRadius={10}
                paddingHorizontal="$3"
              >
                Map
              </Button>
            )}

            {/* Status Action Button */}
            {status !== 'delivered' && (
              <Pressable
                onPress={handleAction}
                disabled={isPending}
                style={({ pressed }) => [
                  styles.actionButtonWrapper,
                  pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                ]}
              >
                <LinearGradient
                  colors={['#1E75FF', '#0066FF', '#004ECC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionGradient}
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      {isAvailable || status === 'pending' ? (
                        <Truck size={14} color="#FFFFFF" />
                      ) : status === 'accepted' ? (
                        <CheckCircle size={14} color="#FFFFFF" />
                      ) : (
                        <Truck size={14} color="#FFFFFF" />
                      )}
                      <Text style={styles.actionButtonText}>
                        {isAvailable || status === 'pending'
                          ? 'ACCEPT DELIVERY'
                          : status === 'accepted'
                          ? 'PICKED UP'
                          : 'DELIVER'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ActiveOrdersScreen() {
  const { user } = useAuth();
  const { data: orders = [], isLoading, refetch } = useOrders();
  const driverId = useDriverId();
  const [refreshing, setRefreshing] = useState(false);

  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => o.driverUserId === driverId && (o.status === 'accepted' || o.status === 'picked_up'))
      .sort((a, b) => Number(a.distanceMiles ?? 0) - Number(b.distanceMiles ?? 0));
  }, [orders, driverId]);

  const availableOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'pending');
  }, [orders]);

  const deliveredOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'delivered' && o.driverUserId === driverId);
  }, [orders, driverId]);

  // Compute Today's Stats from driver's completed and active deliveries
  const allDriverOrders = useMemo(() => {
    return orders.filter((o) => o.driverUserId === driverId);
  }, [orders, driverId]);

  const todayStats = useMemo(() => {
    const totalDeliveries = deliveredOrders.length > 0 ? deliveredOrders.length : allDriverOrders.length;
    let totalCents = 0;
    let totalMiles = 0;
    let totalTipCents = 0;

    const source = deliveredOrders.length > 0 ? deliveredOrders : allDriverOrders;
    for (const o of source) {
      const miles = Number(o.distanceMiles) || 0;
      const tip = Number(o.tipAmount) || 0;
      const earned = calcDriverEarnings(miles, tip);
      totalCents += earned.totalCents;
      totalMiles += miles;
      totalTipCents += tip;
    }

    return {
      deliveries: totalDeliveries,
      miles: totalMiles.toFixed(1),
      totalDisplay: (totalCents / 100).toFixed(2),
      tipsDisplay: (totalTipCents / 100).toFixed(2),
    };
  }, [deliveredOrders, allDriverOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const greetingText = useMemo(() => {
    return getGreeting(user?.displayName || user?.email);
  }, [user]);

  // List data: if driver has active orders, show them; otherwise show available nearby orders!
  const hasActive = activeOrders.length > 0;
  const displayList = hasActive ? activeOrders : availableOrders;
  const sectionTitle = hasActive ? 'Active Deliveries' : 'Available Deliveries';
  const pillCountText = hasActive
    ? `${activeOrders.length} ACTIVE`
    : `${availableOrders.length} NEARBY`;

  return (
    <View style={styles.root}>
      <SafeArea>
        {/* Top Header with greeting on Left and ONLINE badge on Right */}
        <View style={styles.topHeader}>
          <Text style={styles.greetingTitle}>{greetingText}</Text>

          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>ONLINE</Text>
          </View>
        </View>

        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActiveOrderCard
              order={item}
              isAvailable={!hasActive}
              driverUserId={driverId}
              driverDisplayName={user?.displayName || 'Driver'}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Today's Earnings Hero Card */}
              <View style={styles.earningsHeroCard}>
                <LinearGradient
                  colors={['#181C28', '#121520', '#0C0E16']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.earningsHeroGradient}
                >
                  <Text style={styles.heroTitle}>Today's Earnings</Text>
                  <Text style={styles.heroAmount}>${todayStats.totalDisplay}</Text>

                  {/* 3 Metric Columns */}
                  <View style={styles.heroMetricsRow}>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Deliveries</Text>
                      <Text style={styles.metricValue}>{todayStats.deliveries}</Text>
                    </View>

                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Miles</Text>
                      <Text style={styles.metricValue}>{todayStats.miles}</Text>
                    </View>

                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Tips</Text>
                      <Text style={[styles.metricValue, { color: GREEN }]}>
                        +${todayStats.tipsDisplay}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Section Header */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{sectionTitle}</Text>
                <View style={styles.nearbyPill}>
                  <Text style={styles.nearbyPillText}>{pillCountText}</Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Package size={48} color="rgba(255,255,255,0.15)" />
                <SizableText size="$5" fontWeight="800" color="rgba(255,255,255,0.6)" marginTop="$4">
                  No orders right now
                </SizableText>
                <SizableText size="$3" color="rgba(255,255,255,0.35)" marginTop="$2" textAlign="center" maxWidth={260}>
                  New customer orders will appear here in real time as they arrive.
                </SizableText>
              </View>
            ) : (
              <YStack alignItems="center" paddingVertical="$8">
                <ActivityIndicator size="large" color={BLUE} />
              </YStack>
            )
          }
        />
      </SafeArea>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  greetingTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  onlineText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listHeader: {
    marginTop: 14,
    marginBottom: 6,
  },

  /* Hero Earnings Card */
  earningsHeroCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  earningsHeroGradient: {
    padding: 20,
    width: '100%',
  },
  heroTitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  heroAmount: {
    color: GOLD,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 18,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
    paddingTop: 14,
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  nearbyPill: {
    backgroundColor: '#1E2230',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nearbyPillText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  /* Active Order Card */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
    width: '100%',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardAmount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  cardSublabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  cardMiles: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  cardTime: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  /* Timeline */
  timeline: {
    marginBottom: 14,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 20,
    marginRight: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 3,
  },
  timelineLine: {
    width: 1.5,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 2,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 6,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stepAddress: {
    color: '#F1F5F9',
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
  },

  /* Customer Row */
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  customerName: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12.5,
    fontWeight: '600',
  },
  phoneLink: {
    color: '#60A5FA',
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* Card Bottom Actions */
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tipPill: {
    backgroundColor: 'rgba(245, 196, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  tipPillText: {
    color: GOLD,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* Empty Container */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
});

