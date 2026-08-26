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
  TouchableOpacity,
} from 'react-native';
import {
  Button,
  Package,
} from '@blinkdotnew/mobile-ui';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useOrders, useAvailableOrders, useUpdateOrderStatus } from '@/lib/orders';
import { useOrdersRealtime } from '@/lib/realtime';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { useAuth } from '@/hooks/useAuth';
import { useDriverQueue } from '@/lib/driverQueue';
import { useDriverId } from '@/hooks/useDriverId';
import { useMyVerification } from '@/lib/verification';
import { useConnectStatus, useConnectOnboard, openStripeOnboardingSession } from '@/lib/stripeConnect';
import { calcDriverEarnings } from '@/lib/config';
import { colors } from '@/constants/design';
import { SkeletonList, StripeSetupBanner, CustomConfirmModal, useToast } from '@/components/core';

import {
  OrdersHeader,
  OrdersSearchBar,
  DriverOrderCard,
  ActiveDeliveriesBanner,
  DriverOrderFilterModal,
  DriverFilterState,
} from '@/components/Orders';

function haptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
}

export default function OrdersScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<DriverFilterState>({
    scope: 'all',
    distance: 'all',
    tip: 'all',
    sortBy: 'newest',
  });

  const [headerHeight, setHeaderHeight] = useState(200);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const accumDelta = useRef(0);
  const lastDirectionChangeTime = useRef(0);
  const isHeaderVisible = useRef(true);

  const { user } = useAuth();
  const driverId = useDriverId();
  const { showToast } = useToast();
  const updateStatus = useUpdateOrderStatus();
  const { data: connectStatus, refetch: refetchConnect } = useConnectStatus(driverId);
  const connectOnboard = useConnectOnboard();
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const isStripeReady = Boolean(connectStatus?.connected && connectStatus?.payoutsEnabled) || Boolean(user?.stripeAccountId);

  const { data: verification, isLoading: isLoadingVerif } = useMyVerification(user?.id);

  useEffect(() => {
    if (user?.role === 'driver' && !isLoadingVerif && verification?.status !== 'approved') {
      router.replace('/(auth)/driver-verification');
    }
  }, [user?.role, verification?.status, isLoadingVerif]);

  const handleSetupPayouts = async () => {
    setOnboardingLoading(true);
    try {
      const res = await connectOnboard.mutateAsync({
        driverUserId: driverId,
        driverEmail: user?.email,
      });
      if (res?.url) {
        await openStripeOnboardingSession(res.url);
      }
      await refetchConnect();
      setShowStripeModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Could not start bank onboarding', 'error');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleAcceptOrder = async (orderItem: any) => {
    if (!isStripeReady) {
      setShowStripeModal(true);
      return;
    }
    if (atCapacity) {
      showToast('Queue Limit Reached', {
        type: 'warning',
        description: 'Complete existing deliveries before accepting more',
      });
      return;
    }
    haptic();
    const uid = driverId || `guest-${Date.now()}`;
    const uname = user?.displayName ?? user?.email ?? 'Driver';
    try {
      await updateStatus.mutateAsync({
        id: orderItem.id,
        status: 'accepted',
        driverUserId: uid,
        driverName: uname,
      });
      showToast('Order Accepted!', {
        type: 'success',
        description: `Added #${orderItem.id?.slice(-6).toUpperCase()} to your active deliveries`,
      });
    } catch (err: any) {
      showToast(err?.message || 'Could not accept order', 'error');
    }
  };

  const { data: availableOrders = [], isLoading: isLoadingAvailable, refetch: refetchAvailable } = useAvailableOrders();
  const { data: allOrders = [], isLoading: isLoadingAll, refetch: refetchAll } = useOrders();
  const { isConnected } = useOrdersRealtime();

  const orders = useMemo(() => {
    const orderMap = new Map<string, any>();
    (availableOrders || []).forEach((o) => o?.id && orderMap.set(o.id, o));
    (allOrders || []).forEach((o) => {
      if (o?.id && ((o.driverUserId === driverId) || o.status !== 'delivered')) {
        orderMap.set(o.id, { ...(orderMap.get(o.id) || {}), ...o });
      }
    });
    return Array.from(orderMap.values());
  }, [availableOrders, allOrders, driverId]);

  const isLoading = isLoadingAvailable && isLoadingAll && orders.length === 0;

  const { queueCount, atCapacity, isMyOrder } = useDriverQueue(orders, driverId);

  const avatarInitial = useMemo(() => {
    const name = user?.displayName || user?.email || 'Driver';
    return name.charAt(0).toUpperCase();
  }, [user]);

  const myActiveOrders = useMemo(
    () => orders.filter((o) => isMyOrder(o.id)),
    [orders, isMyOrder]
  );

  const filterCounts = useMemo(() => {
    return {
      all: orders.length,
      available: orders.filter((o) => o.status === 'pending').length,
      high_payout: orders.filter((o) => {
        const miles = Number(o.distanceMiles || 0);
        const tip = Number(o.tipAmount || 0);
        return calcDriverEarnings(miles, tip).totalCents >= 1500;
      }).length,
    };
  }, [orders]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.scope !== 'all') count++;
    if (filters.distance !== 'all') count++;
    if (filters.tip !== 'all') count++;
    if (filters.sortBy !== 'newest') count++;
    return count;
  }, [filters]);

  const filtered = useMemo(() => {
    let result = orders;

    if (filters.scope === 'available') {
      result = result.filter((o) => o.status === 'pending');
    } else if (filters.scope === 'high_payout') {
      result = result.filter((o) => {
        const miles = Number(o.distanceMiles || 0);
        const tip = Number(o.tipAmount || 0);
        return calcDriverEarnings(miles, tip).totalCents >= 1500;
      });
    } else {
      result = result.filter((o) => o.status === 'pending' || isMyOrder(o.id));
    }

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

    if (filters.distance !== 'all') {
      result = result.filter((o) => {
        const m = Number(o.distanceMiles || 0);
        if (filters.distance === 'under_3') return m <= 3;
        if (filters.distance === '3_to_7') return m > 3 && m <= 7;
        if (filters.distance === 'over_7') return m > 7;
        return true;
      });
    }

    if (filters.tip !== 'all') {
      result = result.filter((o) => {
        const tip = Number(o.tipAmount || 0);
        if (filters.tip === 'with_tip') return tip > 0;
        if (filters.tip === 'high_tip') return tip >= 500;
        return true;
      });
    }

    result = [...result].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();

      if (filters.sortBy === 'oldest') return timeA - timeB;
      return timeB - timeA;
    });

    return result;
  }, [orders, search, filters, isMyOrder]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'pending').length,
    [orders]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic();
    try {
      await Promise.all([refetchAvailable(), refetchAll()]);
    } catch {
      // Ignore network errors on refresh
    } finally {
      setRefreshing(false);
    }
  }, [refetchAvailable, refetchAll]);

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
        {search.trim() || activeFilterCount > 0 ? 'No matching orders' : 'No available orders'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {search.trim() || activeFilterCount > 0
          ? 'Try adjusting your search query or reset filters.'
          : 'New incoming deliveries will appear here in real time.'}
      </Text>
      {activeFilterCount > 0 ? (
        <Button
          marginTop="$4"
          onPress={() => {
            setSearch('');
            setFilters({ scope: 'all', distance: 'all', tip: 'all', sortBy: 'newest' });
          }}
          backgroundColor="rgba(244,195,0,0.12)"
          borderColor="rgba(244,195,0,0.35)"
          borderWidth={1}
          color={colors.secondary}
          size="$3.5"
          borderRadius={9999}
        >
          Reset Filters
        </Button>
      ) : !search.trim() ? (
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
          onFilterPress={() => setIsFilterModalVisible(true)}
          hasActiveFilter={activeFilterCount > 0}
          filterBadgeCount={activeFilterCount}
        />

        {activeFilterCount > 0 && (
          <View style={styles.activeFiltersRow}>
            {filters.scope !== 'all' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFilters((prev) => ({ ...prev, scope: 'all' }))}
                style={styles.activeFilterChip}
              >
                <Text style={styles.activeFilterChipText}>
                  Scope: {filters.scope === 'available' ? 'Available' : 'High Pay'}
                </Text>
                <MaterialIcons name="close" size={14} color="#ffe399" />
              </TouchableOpacity>
            )}

            {filters.distance !== 'all' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFilters((prev) => ({ ...prev, distance: 'all' }))}
                style={styles.activeFilterChip}
              >
                <Text style={styles.activeFilterChipText}>
                  Distance: {filters.distance === 'under_3' ? '< 3mi' : filters.distance === '3_to_7' ? '3-7mi' : '7mi+'}
                </Text>
                <MaterialIcons name="close" size={14} color="#ffe399" />
              </TouchableOpacity>
            )}

            {filters.tip !== 'all' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFilters((prev) => ({ ...prev, tip: 'all' }))}
                style={styles.activeFilterChip}
              >
                <Text style={styles.activeFilterChipText}>
                  Tip: {filters.tip === 'with_tip' ? 'With Tip' : 'High Tip (5+)'}
                </Text>
                <MaterialIcons name="close" size={14} color="#ffe399" />
              </TouchableOpacity>
            )}

            {filters.sortBy !== 'newest' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFilters((prev) => ({ ...prev, sortBy: 'newest' }))}
                style={styles.activeFilterChip}
              >
                <Text style={styles.activeFilterChipText}>
                  Sort: {filters.sortBy === 'oldest' ? 'Oldest First' : 'Newest First'}
                </Text>
                <MaterialIcons name="close" size={14} color="#ffe399" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                setFilters({ scope: 'all', distance: 'all', tip: 'all', sortBy: 'newest' })
              }
              style={styles.clearAllButton}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
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
            onAccept={() => handleAcceptOrder(item)}
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

      <DriverOrderFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        counts={filterCounts}
      />

      <CustomConfirmModal
        visible={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        onConfirm={handleSetupPayouts}
        variant="warning"
        title="Bank Account Setup Required"
        message="You need to connect your bank account via Stripe before accepting orders. This ensures you can receive payouts for your completed deliveries."
        confirmText="Set Up Payouts"
        cancelText="Maybe Later"
        iconName="account-balance"
        confirmIconName="arrow-forward"
        loading={onboardingLoading}
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
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 227, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffe399',
  },
  clearAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C90A1',
    textDecorationLine: 'underline',
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
