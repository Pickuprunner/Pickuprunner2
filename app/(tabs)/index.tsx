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
  Button,
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
import { SkeletonList, StripeSetupBanner } from '@/components/core';

import {
  OrdersHeader,
  OrdersSearchBar,
  DriverOrderCard,
  ActiveDeliveriesBanner,
} from '@/components/Orders';

function haptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
}

export default function OrdersScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

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

  const filtered = useMemo(() => {
    let result = orders.filter((o) => o.status === 'pending' || isMyOrder(o.id));

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((o) => {
        const idStr = (o.id || '').toLowerCase();
        const custName = (o.customerName || '').toLowerCase();
        const phone = (o.customerPhone || '').toLowerCase();
        const pickup = (o.pickupAddress || '').toLowerCase();
        const delivery = (o.deliveryAddress || '').toLowerCase();
        const items = (o.items || '').toLowerCase();

        return (
          idStr.includes(q) ||
          custName.includes(q) ||
          phone.includes(q) ||
          pickup.includes(q) ||
          delivery.includes(q) ||
          items.includes(q)
        );
      });
    }

    result = [...result].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();

      if (sortBy === 'oldest') return timeA - timeB;
      return timeB - timeA;
    });

    return result;
  }, [orders, search, sortBy, isMyOrder]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'pending').length,
    [orders]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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

  useEffect(() => {
    isHeaderVisible.current = true;
    Animated.timing(headerTranslateY, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [search, headerTranslateY]);

  const listHeader = useMemo(
    () => (
      <View>
        <View style={{ height: headerHeight + 4 }} />
        <StripeSetupBanner />
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
          ? 'Try adjusting your search query.'
          : 'New incoming deliveries will appear here in real time.'}
      </Text>
      {search.trim() ? (
        <Button
          marginTop="$4"
          onPress={() => setSearch('')}
          backgroundColor="rgba(244,195,0,0.12)"
          borderColor="rgba(244,195,0,0.35)"
          borderWidth={1}
          color={colors.secondary}
          size="$3.5"
          borderRadius={9999}
        >
          Clear Search
        </Button>
      ) : (
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
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        <OrdersSearchBar
          search={search}
          onSearchChange={setSearch}
          showFilter={false}
        />
      </Animated.View>

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
    backgroundColor: 'rgba(15, 19, 28, 0.95)',
    paddingBottom: 4,
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
