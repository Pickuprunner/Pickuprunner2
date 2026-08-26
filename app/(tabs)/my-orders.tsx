import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  RefreshControl,
  Platform,
  StyleSheet,
  View,
  Text,
  LayoutChangeEvent,
} from 'react-native';
import { Package } from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useOrders } from '@/lib/orders';
import { ordersApi } from '@/apis/orders';
import { useOrderStore } from '@/store/useOrderStore';
import { useOrdersRealtime } from '@/lib/realtime';
import { useDriverId } from '@/hooks/useDriverId';
import { useAuth } from '@/hooks/useAuth';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { calcDriverEarnings } from '@/lib/config';
import { colors } from '@/constants/design';
import { SkeletonList } from '@/components/core';

import {
  MyOrdersHeader,
  TodayEarningsCard,
  DriverOrderCard as OrderCard,
} from '@/components/Orders';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  }
}

function getGreeting(name?: string) {
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const driverName = name ? name.split(' ')[0] : 'Driver';
  return `${timeGreeting}, ${driverName}`;
}

export default function MyOrdersScreen() {
  const { user } = useAuth();
  const { data: orders = [], isLoading, refetch } = useOrders();
  const { isConnected } = useOrdersRealtime();
  const driverId = useDriverId();
  const [refreshing, setRefreshing] = useState(false);

  // Sync driver's assigned orders from backend on mount
  useEffect(() => {
    if (user?.role === 'driver') {
      ordersApi.getMine().then((mine) => {
        if (Array.isArray(mine)) {
          mine.forEach((item) => {
            useOrderStore.getState().upsertOrder(item as any);
          });
        }
      }).catch(() => {});
    }
  }, [user?.role]);

  // ─── 1. Header State & Smooth Scroll Animation Logic ───
  const [headerHeight, setHeaderHeight] = useState(150);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const accumDelta = useRef(0);
  const lastDirectionChangeTime = useRef(0);
  const isHeaderVisible = useRef(true);

  const avatarInitial = useMemo(() => {
    const name = user?.displayName || user?.email || 'Driver';
    return name.charAt(0).toUpperCase();
  }, [user]);

  const greetingText = useMemo(() => {
    return getGreeting(user?.displayName || user?.email);
  }, [user]);

  // Driver active orders in progress (accepted / shopping / picked_up / en_route)
  const activeOrders = useMemo(() => {
    return orders
      .filter(
        (o) =>
          o.driverUserId === driverId &&
          (o.status === 'assigned' ||
            o.status === 'accepted' ||
            o.status === 'shopping' ||
            o.status === 'picked_up' ||
            o.status === 'en_route')
      )
      .sort((a, b) => Number(a.distanceMiles ?? 0) - Number(b.distanceMiles ?? 0));
  }, [orders, driverId]);

  const deliveredOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'delivered' && o.driverUserId === driverId);
  }, [orders, driverId]);

  const allDriverOrders = useMemo(() => {
    return orders.filter((o) => o.driverUserId === driverId);
  }, [orders, driverId]);

  // Compute Today's Stats from driver's completed and active deliveries
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
    haptic();
    try {
      if (user?.role === 'driver') {
        const mine = await ordersApi.getMine().catch(() => []);
        if (Array.isArray(mine)) {
          mine.forEach((item) => {
            useOrderStore.getState().upsertOrder(item as any);
          });
        }
      }
      await refetch();
    } catch {
      // Ignore network errors on refresh
    } finally {
      setRefreshing(false);
    }
  }, [refetch, user?.role]);

  // ─── 2. Header Layout Measurement ───
  const onHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height && Math.abs(height - headerHeight) > 2) {
        setHeaderHeight(height);
      }
    },
    [headerHeight]
  );

  // ─── 3. Scroll Event Handler with Debounce ───
  const handleScroll = useCallback(
    (event: any) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;

      // Reset to visible at top of list
      if (currentScrollY <= 0) {
        accumDelta.current = 0;
        if (!isHeaderVisible.current) {
          isHeaderVisible.current = true;
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();
        }
        lastScrollY.current = currentScrollY;
        return;
      }

      const delta = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;

      const now = Date.now();
      const isDirectionSwitch =
        (delta > 0 && accumDelta.current < 0) ||
        (delta < 0 && accumDelta.current > 0);

      if (isDirectionSwitch) {
        accumDelta.current = 0;
        lastDirectionChangeTime.current = now;
      }
      accumDelta.current += delta;

      if (now - lastDirectionChangeTime.current < 100) {
        return;
      }

      // Hide header on scroll down
      if (accumDelta.current > 35 && currentScrollY > 50 && isHeaderVisible.current) {
        isHeaderVisible.current = false;
        Animated.timing(headerTranslateY, {
          toValue: -headerHeight,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
      // Show header on scroll up
      else if (accumDelta.current < -60 && !isHeaderVisible.current) {
        isHeaderVisible.current = true;
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }
    },
    [headerHeight, headerTranslateY]
  );

  const hasActive = activeOrders.length > 0;
  const displayList = activeOrders;
  const sectionTitle = 'Active Deliveries';
  const pillCountText = `${activeOrders.length} ACTIVE`;

  const listHeader = useMemo(
    () => (
      <View>
        <View style={{ height: headerHeight + 4 }} />

        <TodayEarningsCard stats={todayStats} />

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <View style={[styles.sectionPill, hasActive && styles.sectionPillActive]}>
            <Text style={[styles.sectionPillText, hasActive && styles.sectionPillActiveText]}>
              {pillCountText}
            </Text>
          </View>
        </View>

        {isLoading && <SkeletonList count={2} />}
      </View>
    ),
    [headerHeight, todayStats, sectionTitle, hasActive, pillCountText, isLoading]
  );

  const EmptyView = !isLoading ? (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Package size={36} color="rgba(244, 195, 0, 0.4)" />
      </View>
      <Text style={styles.emptyTitle}>No active orders</Text>
      <Text style={styles.emptySubtitle}>
        Accept orders from the Orders tab to begin deliveries.
      </Text>
    </View>
  ) : null;

  return (
    <View style={styles.root}>
      <Animated.View
        onLayout={onHeaderLayout}
        style={[
          styles.floatingHeader,
          {
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <MyOrdersHeader
          greetingText={greetingText}
          activeCount={activeOrders.length}
          isConnected={isConnected}
          showAvatar
          avatar={avatarInitial}
          onAvatarPress={() => {
            haptic();
            router.push('/(tabs)/profile');
          }}
        />
      </Animated.View>

      <FlatList
        data={displayList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            isMyOrder={item.driverUserId === driverId}
            driverUserId={driverId}
            driverDisplayName={user?.displayName ?? user?.email ?? driverId?.slice(0, 8)}
            onPress={() => {
              setSelectedOrder(item);
              router.push(`/order/${item.id}`);
            }}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={EmptyView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={Platform.OS === 'android' ? headerHeight : 0}
            tintColor={colors.secondary}
            colors={[colors.secondaryContainer]}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F131C',
    position: 'relative',
    overflow: 'hidden',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'transparent',
  },
  list: {
    paddingBottom: 40,
    backgroundColor: '#0F131C',
    flexGrow: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#DFE2EF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionPillActive: {
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    borderColor: 'rgba(244, 195, 0, 0.3)',
  },
  sectionPillText: {
    color: '#8C90A1',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionPillActiveText: {
    color: '#FFE399',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#DFE2EF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#C2C6D8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
