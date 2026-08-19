import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import {
  YStack,
  SizableText,
  Button,
  Spinner,
  Package,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useOrders } from '@/lib/orders';
import { useOrdersRealtime } from '@/lib/realtime';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { useAuth } from '@/hooks/useAuth';
import { useDriverQueue } from '@/lib/driverQueue';
import { useDriverId } from '@/hooks/useDriverId';
import { colors } from '@/constants/design';
import { CustomLoading, SkeletonList } from '@/components/core';

import {
  OrdersHeader,
  OrdersSearchBar,
  DriverOrderCard,
  ActiveDeliveriesBanner,
} from '@/components/Orders';

function haptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function OrdersScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // ─── 1. State, Refs & Animated Values (Smooth Animation Logic) ───
  const [headerHeight, setHeaderHeight] = useState(200);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const accumDelta = useRef(0);
  const lastDirectionChangeTime = useRef(0);
  const isHeaderVisible = useRef(true);

  const { data: orders = [], isLoading, refetch } = useOrders();
  const { isConnected } = useOrdersRealtime();
  const { user } = useAuth();
  const driverId = useDriverId();
  const { queueCount, atCapacity, isMyOrder } = useDriverQueue(orders, driverId);

  const avatarInitial = useMemo(() => {
    const name = user?.displayName || user?.email || 'Driver';
    return name.charAt(0).toUpperCase();
  }, [user]);

  const myActiveOrders = useMemo(
    () => orders.filter((o) => isMyOrder(o.id)),
    [orders, isMyOrder]
  );

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);

  const filtered = useMemo(() => {
    if (!search.trim()) return pendingOrders;
    const q = search.toLowerCase();
    return pendingOrders.filter(
      (o) =>
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.toLowerCase().includes(q) ||
        o.deliveryAddress?.toLowerCase().includes(q) ||
        o.pickupAddress?.toLowerCase().includes(q)
    );
  }, [pendingOrders, search]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'pending').length,
    [orders]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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

      // 1. Reset to visible when at top of list
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

      // 2. Track delta and direction switches
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

      // Debounce direction change for 100ms to eliminate jitter
      if (now - lastDirectionChangeTime.current < 100) {
        return;
      }

      // 3. Hide header: Scroll Down (accumDelta > 35 & scrollY > 50)
      if (accumDelta.current > 35 && currentScrollY > 50 && isHeaderVisible.current) {
        isHeaderVisible.current = false;
        Animated.timing(headerTranslateY, {
          toValue: -headerHeight,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
      // 4. Show header: Scroll Up (accumDelta < -60)
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

  // ─── 4. Reset Header on Search Change ───
  useEffect(() => {
    isHeaderVisible.current = true;
    Animated.timing(headerTranslateY, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [search, headerTranslateY]);

  // ─── 5. List Header Spacer ───
  const listHeader = useMemo(
    () => (
      <View>
        <View style={{ height: headerHeight + 8 }} />
        {isLoading && <SkeletonList count={3} />}
      </View>
    ),
    [headerHeight, isLoading]
  );

  const EmptyView = !isLoading ? (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Package size={36} color="rgba(244, 195, 0, 0.4)" />
      </View>
      <Text style={styles.emptyTitle}>
        {search.trim() ? 'No matching orders' : 'No available orders'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {search.trim()
          ? 'Try adjusting your search query'
          : 'New incoming deliveries will appear here in real time.'}
      </Text>
      {!search.trim() && (
        <Button
          marginTop="$4"
          onPress={onRefresh}
          backgroundColor="rgba(244,195,0,0.12)"
          borderColor="rgba(244,195,0,0.35)"
          borderWidth={1}
          color={colors.secondary}
          size="$3.5"
          borderRadius={9999}
        >
          Refresh Orders
        </Button>
      )}
    </View>
  ) : null;

  return (
    <View style={styles.root}>
      {/* ─── Absolute Floating Animated Header ─── */}
      <Animated.View
        onLayout={onHeaderLayout}
        style={[
          styles.floatingHeader,
          {
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <OrdersHeader
          showSearch={false}
          showAvatar
          avatar={avatarInitial}
          onAvatarPress={() => {
            haptic();
            router.push('/(tabs)/profile');
          }}
          pendingCount={pendingCount}
          queueCount={queueCount}
          atCapacity={atCapacity}
          isConnected={isConnected}
        />
        <OrdersSearchBar
          search={search}
          onSearchChange={setSearch}
          onFilterPress={haptic}
        />
      </Animated.View>

      {/* ─── Scrollable Orders List ─── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DriverOrderCard
            order={item}
            isMyOrder={isMyOrder(item.id)}
            driverAtCapacity={atCapacity && !isMyOrder(item.id)}
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
        contentContainerStyle={[
          styles.list,
          queueCount > 0 && { paddingBottom: 110 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Floating Active Status Module */}
      <ActiveDeliveriesBanner queueCount={queueCount} orders={myActiveOrders} />
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
    paddingBottom: 32,
    backgroundColor: '#0F131C',
    flexGrow: 1,
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
