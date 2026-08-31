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
  TouchableOpacity,
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
import { SkeletonList, CustomLoading } from '@/components/core';

import {
  MyOrdersHeader,
  TodayEarningsCard,
  DriverMyOrderCard,
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
          (o.driverUserId === driverId || !o.driverUserId) &&
          (o.status === 'assigned' ||
            o.status === 'accepted' ||
            o.status === 'shopping' ||
            o.status === 'picked_up' ||
            o.status === 'en_route')
      )
      .sort((a, b) => Number(a.distanceMiles ?? 0) - Number(b.distanceMiles ?? 0));
  }, [orders, driverId]);

  const [selectedTab, setSelectedTab] = useState<'active' | 'completed'>('active');

  const deliveredOrders = useMemo(() => {
    return orders
      .filter(
        (o) =>
          o.status === 'delivered' &&
          (o.driverUserId === driverId || !o.driverUserId)
      )
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [orders, driverId]);

  const allDriverOrders = useMemo(() => {
    return orders.filter((o) => o.driverUserId === driverId || !o.driverUserId);
  }, [orders, driverId]);

  // Compute Today's Stats from driver's completed and active deliveries
  const todayStats = useMemo(() => {
    const totalDeliveries = deliveredOrders.length;
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
      const minDelay = new Promise((resolve) => setTimeout(resolve, 550));
      await Promise.all([refetch(), minDelay]);
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

  const displayList = selectedTab === 'active' ? activeOrders : deliveredOrders;

  const listHeader = useMemo(
    () => (
      <View>
        <View style={{ height: headerHeight + 4 }} />

        <TodayEarningsCard stats={todayStats} />

        <View style={styles.sectionHeaderRow}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                haptic();
                setSelectedTab('active');
              }}
              style={[
                styles.tabBtn,
                selectedTab === 'active' && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  selectedTab === 'active' && styles.tabBtnTextActive,
                ]}
              >
                Active ({activeOrders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                haptic();
                setSelectedTab('completed');
              }}
              style={[
                styles.tabBtn,
                selectedTab === 'completed' && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  selectedTab === 'completed' && styles.tabBtnTextActive,
                ]}
              >
                Completed ({deliveredOrders.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading && <SkeletonList count={2} />}
      </View>
    ),
    [headerHeight, todayStats, selectedTab, activeOrders.length, deliveredOrders.length, isLoading]
  );

  const EmptyView = !isLoading ? (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <Package size={52} color={selectedTab === 'completed' ? '#00E297' : '#FFE399'} />
      </View>
      <Text style={styles.emptyTitle}>
        {selectedTab === 'active' ? 'No Active Orders' : 'No Completed Deliveries'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {selectedTab === 'active'
          ? 'Claim available orders from the Orders tab to begin deliveries.'
          : 'Completed and delivered orders will appear here.'}
      </Text>
      {selectedTab === 'active' ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)')}
          style={styles.emptyActionBtn}
        >
          <Text style={styles.emptyActionBtnText}>Find Available Orders</Text>
        </TouchableOpacity>
      ) : null}
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
        renderItem={({ item }) => {
          if (selectedTab === 'completed') {
            const miles = Number(item.distanceMiles ?? 0);
            const earnings = calcDriverEarnings(miles, Number(item.tipAmount ?? 0));
            const shortId = item.id ? item.id.slice(-6).toUpperCase() : '------';
            const customerName = item.customerName || (item as any).customer_name || 'Customer';
            const address = item.deliveryAddress || (item as any).delivery_address || 'Delivery Destination';

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  haptic();
                  setSelectedOrder(item);
                  router.push(`/order/${item.id}`);
                }}
                style={styles.minimalCard}
              >
                <View style={styles.minimalCardLeft}>
                  <View style={styles.minimalAvatar}>
                    <Text style={styles.minimalAvatarText}>
                      {customerName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.minimalCustomerName} numberOfLines={1}>
                        {customerName}
                      </Text>
                      <Text style={styles.minimalRefText}>#{shortId}</Text>
                    </View>
                    <Text style={styles.minimalAddress} numberOfLines={1}>
                      {address}
                    </Text>
                  </View>
                </View>

                <View style={styles.minimalCardRight}>
                  <Text style={styles.minimalEarnings}>{earnings.totalDisplay}</Text>
                  <View style={styles.deliveredPill}>
                    <Text style={styles.deliveredPillText}>DELIVERED ✓</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <DriverMyOrderCard
              order={item}
              driverUserId={driverId}
              driverDisplayName={user?.displayName ?? user?.email ?? driverId?.slice(0, 8)}
              onPress={() => {
                setSelectedOrder(item);
                router.push(`/order/${item.id}`);
              }}
            />
          );
        }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={EmptyView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
      <CustomLoading visible={refreshing} variant="circle" overlay position="top" />
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
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8C90A1',
  },
  tabBtnTextActive: {
    color: '#DFE2EF',
    fontWeight: '700',
  },
  minimalCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  minimalCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  minimalAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00E297',
  },
  minimalCustomerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DFE2EF',
    maxWidth: 140,
  },
  minimalRefText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8C90A1',
  },
  minimalAddress: {
    fontSize: 12,
    color: '#8C90A1',
  },
  minimalCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  minimalEarnings: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DFE2EF',
  },
  deliveredPill: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: 'rgba(0, 226, 151, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deliveredPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E297',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIconWrapper: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 4,
  },
  emptyActionBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: '#FFE399',
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F131C',
    letterSpacing: 0.2,
  },
});
