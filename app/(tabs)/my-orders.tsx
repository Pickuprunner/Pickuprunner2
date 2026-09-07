import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Platform,
  StyleSheet,
  View,
  Text,
  LayoutChangeEvent,
  TouchableOpacity,
} from 'react-native';
import { Package } from '@blinkdotnew/mobile-ui';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { isDeliveredToday } from '@/lib/driverQueue';
import { colors } from '@/constants/design';
import { SkeletonList, CustomLoading, CustomRefreshControl } from '@/components/core';

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

function getDeliveryDateLabel(order: any): string {
  const rawDate =
    order.deliveredAt ||
    order.delivered_at ||
    order.updatedAt ||
    order.updated_at ||
    order.createdAt ||
    order.created_at;
  if (!rawDate) return 'Past Deliveries';
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return 'Past Deliveries';

  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  const isThisYear = d.getFullYear() === today.getFullYear();
  if (isThisYear) {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDeliveryTime(order: any): string {
  const rawDate =
    order.deliveredAt ||
    order.delivered_at ||
    order.updatedAt ||
    order.updated_at ||
    order.createdAt ||
    order.created_at;
  if (!rawDate) return '';
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function MyOrdersScreen() {
  const { user } = useAuth();
  const { data: orders = [], isLoading, refetch } = useOrders();
  const { isConnected } = useOrdersRealtime();
  const driverId = useDriverId();
  const [refreshing, setRefreshing] = useState(false);

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

  const activeOrders = useMemo(() => {
    return (orders as any[])
      .filter(
        (o: any) =>
          (driverId ? o.driverUserId === driverId : true) &&
          (o.status === 'assigned' ||
            o.status === 'accepted' ||
            o.status === 'shopping' ||
            o.status === 'picked_up' ||
            o.status === 'en_route')
      )
      .sort((a: any, b: any) => Number(a.distanceMiles ?? 0) - Number(b.distanceMiles ?? 0));
  }, [orders, driverId]);

  const [selectedTab, setSelectedTab] = useState<'active' | 'delivered'>('active');
  const [tabToggleWidth, setTabToggleWidth] = useState(0);
  const tabSlideAnim = useRef(new Animated.Value(selectedTab === 'delivered' ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(tabSlideAnim, {
      toValue: selectedTab === 'delivered' ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  }, [selectedTab, tabSlideAnim]);

  const getOrderTimestamp = (o: any) => {
    const raw =
      o.deliveredAt ||
      o.delivered_at ||
      o.updatedAt ||
      o.updated_at ||
      o.createdAt ||
      o.created_at;
    if (!raw) return 0;
    const t = new Date(raw).getTime();
    return isNaN(t) ? 0 : t;
  };

  const deliveredOrders = useMemo(() => {
    return (orders as any[])
      .filter(
        (o: any) =>
          o.status === 'delivered' &&
          (driverId ? o.driverUserId === driverId : true)
      )
      .sort((a: any, b: any) => getOrderTimestamp(b) - getOrderTimestamp(a));
  }, [orders, driverId]);

  const todayDeliveredOrders = useMemo(() => {
    return deliveredOrders.filter((o: any) => isDeliveredToday(o));
  }, [deliveredOrders]);

  const deliveredGroupStats = useMemo(() => {
    const statsMap: Record<string, { count: number; totalCents: number }> = {};
    for (const order of deliveredOrders) {
      const label = getDeliveryDateLabel(order);
      const miles = Number(order.distanceMiles ?? 0);
      const tip = Number(order.tipAmount ?? 0);
      const earned = calcDriverEarnings(miles, tip);
      if (!statsMap[label]) {
        statsMap[label] = { count: 0, totalCents: 0 };
      }
      statsMap[label].count += 1;
      statsMap[label].totalCents += earned.totalCents;
    }
    return statsMap;
  }, [deliveredOrders]);

  
  const todayStats = useMemo(() => {
    let totalCents = 0;
    let totalMiles = 0;
    let totalTipCents = 0;

    for (const o of todayDeliveredOrders) {
      const miles = Number(o.distanceMiles) || 0;
      const tip = Number(o.tipAmount) || 0;
      const earned = calcDriverEarnings(miles, tip);
      totalCents += earned.totalCents;
      totalMiles += miles;
      totalTipCents += tip;
    }

    return {
      deliveries: todayDeliveredOrders.length,
      miles: totalMiles.toFixed(1),
      totalDisplay: (totalCents / 100).toFixed(2),
      tipsDisplay: (totalTipCents / 100).toFixed(2),
    };
  }, [todayDeliveredOrders]);

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
     
    } finally {
      setRefreshing(false);
    }
  }, [refetch, user?.role]);

 
  const onHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height && Math.abs(height - headerHeight) > 2) {
        setHeaderHeight(height);
      }
    },
    [headerHeight]
  );

 
  const handleScroll = useCallback(
    (event: any) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;

     
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

     
      if (accumDelta.current > 35 && currentScrollY > 50 && isHeaderVisible.current) {
        isHeaderVisible.current = false;
        Animated.timing(headerTranslateY, {
          toValue: -headerHeight,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
      
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

        <TodayEarningsCard
          stats={todayStats}
          onPress={() => {
            haptic();
            router.push('/(tabs)/earnings');
          }}
        />

        <View style={styles.sectionHeaderRow}>
          <View
            style={styles.tabToggleContainer}
            onLayout={(e) => setTabToggleWidth(e.nativeEvent.layout.width)}
          >
            {tabToggleWidth > 0 && (
              <Animated.View
                style={[
                  styles.slidingTabPill,
                  {
                    width: (tabToggleWidth - 8) / 2,
                    left: tabSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, tabToggleWidth - 4 - (tabToggleWidth - 8) / 2],
                    }),
                    borderColor:
                      selectedTab === 'active'
                        ? 'rgba(255, 227, 153, 0.45)'
                        : 'rgba(0, 226, 151, 0.45)',
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    selectedTab === 'active'
                      ? ['rgba(255, 227, 153, 0.18)', 'rgba(255, 227, 153, 0.04)']
                      : ['rgba(0, 226, 151, 0.20)', 'rgba(0, 226, 151, 0.04)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.slidingTabGradient}
                />
              </Animated.View>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                haptic();
                setSelectedTab('active');
              }}
              style={styles.tabBtn}
            >
              <MaterialIcons
                name="local-shipping"
                size={16}
                color={selectedTab === 'active' ? '#FFE399' : '#8C90A1'}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  selectedTab === 'active' && styles.tabBtnTextActiveGold,
                ]}
              >
                Active
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  selectedTab === 'active' && styles.tabBadgeActiveGold,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    selectedTab === 'active' && styles.tabBadgeTextActiveGold,
                  ]}
                >
                  {activeOrders.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                haptic();
                setSelectedTab('delivered');
              }}
              style={styles.tabBtn}
            >
              <MaterialIcons
                name="check-circle"
                size={16}
                color={selectedTab === 'delivered' ? '#00E297' : '#8C90A1'}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  selectedTab === 'delivered' && styles.tabBtnTextActiveGreen,
                ]}
              >
                Delivered
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  selectedTab === 'delivered' && styles.tabBadgeActiveGreen,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    selectedTab === 'delivered' && styles.tabBadgeTextActiveGreen,
                  ]}
                >
                  {deliveredOrders.length}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading && <SkeletonList count={2} />}
      </View>
    ),
    [headerHeight, todayStats, selectedTab, activeOrders.length, deliveredOrders.length, isLoading, tabToggleWidth, tabSlideAnim]
  );

  const EmptyView = !isLoading ? (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <Package size={52} color={selectedTab === 'delivered' ? '#00E297' : '#FFE399'} />
      </View>
      <Text style={styles.emptyTitle}>
        {selectedTab === 'active' ? 'No Active Orders' : 'No Delivered Orders'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {selectedTab === 'active'
          ? 'Claim available orders from the Orders tab to begin deliveries.'
          : 'Delivered orders will appear here.'}
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
          avatarUrl={user?.photoUrl}
          onAvatarPress={() => {
            haptic();
            router.push('/(tabs)/profile');
          }}
        />
      </Animated.View>

      <FlatList
        data={displayList}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          if (selectedTab === 'delivered') {
            const dateLabel = getDeliveryDateLabel(item);
            const prevItem = index > 0 ? (displayList as any[])[index - 1] : null;
            const isFirstOfGroup = !prevItem || getDeliveryDateLabel(prevItem) !== dateLabel;
            const groupStats = deliveredGroupStats[dateLabel];

            const miles = Number(item.distanceMiles ?? 0);
            const earnings = calcDriverEarnings(miles, Number(item.tipAmount ?? 0));
            const shortId = item.id ? item.id.slice(-6).toUpperCase() : '------';
            const customerName = item.customerName || (item as any).customer_name || 'Customer';
            const address = item.deliveryAddress || (item as any).delivery_address || 'Delivery Destination';
            const deliveredTime = formatDeliveryTime(item);

            return (
              <View>
                {isFirstOfGroup && (
                  <View style={styles.dateGroupHeader}>
                    <View style={styles.dateGroupBadge}>
                      <MaterialIcons name="event" size={14} color="#FFE399" />
                      <Text style={styles.dateGroupText}>{dateLabel}</Text>
                    </View>
                    {groupStats && (
                      <Text style={styles.dateGroupStatsText}>
                        {groupStats.count} {groupStats.count === 1 ? 'order' : 'orders'} • ${(groupStats.totalCents / 100).toFixed(2)}
                      </Text>
                    )}
                  </View>
                )}

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
                    {!!deliveredTime && (
                      <Text style={styles.deliveredTimeText}>{deliveredTime}</Text>
                    )}
                    <Text style={styles.minimalEarnings}>${earnings.totalDisplay}</Text>
                  </View>
                </TouchableOpacity>
              </View>
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
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  tabToggleContainer: {
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    padding: 4,
  },
  slidingTabPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  slidingTabGradient: {
    flex: 1,
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    zIndex: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8C90A1',
  },
  tabBtnTextActiveGold: {
    color: '#FFE399',
    fontWeight: '700',
  },
  tabBtnTextActiveGreen: {
    color: '#00E297',
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBadgeActiveGold: {
    backgroundColor: 'rgba(255, 227, 153, 0.15)',
  },
  tabBadgeActiveGreen: {
    backgroundColor: 'rgba(0, 226, 151, 0.15)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C90A1',
  },
  tabBadgeTextActiveGold: {
    color: '#FFE399',
  },
  tabBadgeTextActiveGreen: {
    color: '#00E297',
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
    justifyContent: 'center',
    gap: 3,
  },
  deliveredTimeText: {
    fontSize: 11,
    color: '#8C90A1',
    fontWeight: '600',
  },
  minimalEarnings: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DFE2EF',
    letterSpacing: -0.3,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginTop: 10,
    marginBottom: 10,
  },
  dateGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateGroupText: {
    color: '#DFE2EF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dateGroupStatsText: {
    color: '#8C90A1',
    fontSize: 12,
    fontWeight: '600',
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
