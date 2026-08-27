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
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOrders, useAvailableOrders, useUpdateOrderStatus, useClaimOrder } from '@/lib/orders';
import { useOrderStore } from '@/store/useOrderStore';
import { useOrdersRealtime } from '@/lib/realtime';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { useAuth } from '@/hooks/useAuth';
import { useDriverQueue } from '@/lib/driverQueue';
import { useDriverId } from '@/hooks/useDriverId';
import { useMyVerification } from '@/lib/verification';
import { useDriverAccreditation } from '@/lib/accreditation';
import { useConnectStatus, useConnectOnboard, openStripeOnboardingSession } from '@/lib/stripeConnect';
import { calcDriverEarnings } from '@/lib/config';
import { colors } from '@/constants/design';
import { SkeletonList, StripeSetupBanner, CustomConfirmModal, useToast } from '@/components/core';

import {
  OrdersHeader,
  OrdersSearchBar,
  DriverOrderCard,
  ActiveDeliveriesBanner,
} from '@/components/Orders';
import { DriverProfileStatusScreen } from '@/components/driver-verification';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  }
}

export default function OrdersScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [driverLocation, setDriverLocation] = useState<{ lat?: number; lng?: number }>({});

  const [headerHeight, setHeaderHeight] = useState(200);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const accumDelta = useRef(0);
  const lastDirectionChangeTime = useRef(0);
  const isHeaderVisible = useRef(true);

  useEffect(() => {
    let isMounted = true;
    const MOCK_LOCATION = { lat: 31.9505, lng: -110.9747 };

    if (__DEV__) {
      setDriverLocation(MOCK_LOCATION);
      return;
    }

    async function initLocation() {
      try {
        if (Platform.OS === 'web') {
          if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (isMounted && pos?.coords) {
                  setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                }
              },
              () => {
                if (isMounted) setDriverLocation(MOCK_LOCATION);
              },
              { timeout: 4000 }
            );
          } else if (isMounted) {
            setDriverLocation(MOCK_LOCATION);
          }
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (isMounted && pos?.coords) {
            setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            return;
          }
        }
        if (isMounted) setDriverLocation(MOCK_LOCATION);
      } catch (err) {
        console.log('[OrdersScreen] GPS unavailable, using mock location');
        if (isMounted) setDriverLocation(MOCK_LOCATION);
      }
    }
    initLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  const { user } = useAuth();
  const driverId = useDriverId();
  const { showToast } = useToast();
  const updateStatus = useUpdateOrderStatus();
  const claimOrder = useClaimOrder();
  const { data: connectStatus, refetch: refetchConnect } = useConnectStatus(driverId);
  const connectOnboard = useConnectOnboard();
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const isStripeReady = Boolean(connectStatus?.connected && connectStatus?.payoutsEnabled) || Boolean(user?.stripeAccountId);

  const { data: verification, isLoading: isLoadingVerif } = useMyVerification(user?.id);
  const { data: accreditation, isLoading: isLoadingAccred } = useDriverAccreditation();

  const isApproved =
    verification?.status === 'approved' ||
    accreditation?.profile?.accreditationStatus === 'approved';

  const isSubmitted =
    Boolean(accreditation?.profile?.isSubmitted) ||
    accreditation?.profile?.accreditationStatus === 'under_review' ||
    verification?.status === 'pending';

  useEffect(() => {
    if (
      user?.role === 'driver' &&
      !isLoadingVerif &&
      !isLoadingAccred &&
      !isApproved &&
      !isSubmitted &&
      accreditation?.profile?.accreditationStatus === 'not_started'
    ) {
      router.replace('/(auth)/driver-verification');
    }
  }, [user?.role, isApproved, isSubmitted, isLoadingVerif, isLoadingAccred, accreditation?.profile?.accreditationStatus]);

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
      useOrderStore.getState().upsertOrder({
        ...orderItem,
        status: 'accepted',
        driverUserId: uid,
        driverName: uname,
      });
      await claimOrder.mutateAsync({
        orderId: orderItem.id,
        driverUserId: uid,
        driverName: uname,
      });
      await Promise.all([refetchAvailable(), refetchAll()]).catch(() => {});
      showToast('Order Accepted!', {
        type: 'success',
        description: `Added #${orderItem.id?.slice(-6).toUpperCase()} to your active deliveries`,
      });
    } catch (err: any) {
      const errorMsg = err?.data?.message || err?.message || 'Could not accept order';
      const code = err?.data?.code;
      const isAccreditationError =
        err?.status === 403 &&
        (code === 'not_started' ||
          code === 'in_progress' ||
          code === 'under_review' ||
          code === 'rejected' ||
          code === 'license_expired' ||
          code === 'insurance_expired');

      if (isAccreditationError) {
        showToast(errorMsg, { type: 'error' });
        router.push('/(auth)/driver-verification');
      } else {
        showToast(errorMsg, 'error');
      }
    }
  };

  const {
    data: availableOrders = [],
    isLoading: isLoadingAvailable,
    refetch: refetchAvailable,
  } = useAvailableOrders({
    lat: driverLocation.lat,
    lng: driverLocation.lng,
    radiusMiles: 25,
  });
  const { data: allOrders = [], isLoading: isLoadingAll, refetch: refetchAll } = useOrders();
  const { isConnected } = useOrdersRealtime();

  // Job board displays exclusively unassigned pending jobs that are not already claimed
  const orders = useMemo(() => {
    const activeOrClaimedIds = new Set(
      (allOrders || [])
        .filter((o) => o.status !== 'pending' || !!o.driverUserId)
        .map((o) => o.id)
    );
    return (availableOrders || []).filter(
      (o) => o.status === 'pending' && !o.driverUserId && !activeOrClaimedIds.has(o.id)
    );
  }, [availableOrders, allOrders]);

  const isLoading = isLoadingAvailable && orders.length === 0;

  // Active queue tracked from driver's claimed orders
  const { queueCount, atCapacity } = useDriverQueue(allOrders, driverId);

  const avatarInitial = useMemo(() => {
    const name = user?.displayName || user?.email || 'Driver';
    return name.charAt(0).toUpperCase();
  }, [user]);

  const myActiveOrders = useMemo(
    () =>
      (allOrders || []).filter(
        (o) =>
          o.driverUserId === driverId &&
          (o.status === 'assigned' ||
            o.status === 'accepted' ||
            o.status === 'shopping' ||
            o.status === 'picked_up' ||
            o.status === 'en_route')
      ),
    [allOrders, driverId]
  );

  const filtered = useMemo(() => {
    let result = orders;

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
  }, [orders, search, sortBy]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'pending').length,
    [orders]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic();
    try {
      if (__DEV__) {
        setDriverLocation({ lat: 31.9505, lng: -110.9747 });
      } else if (Platform.OS !== 'web') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (pos?.coords) {
              setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            }
          }
        } catch {
          if (!driverLocation.lat) {
            setDriverLocation({ lat: 31.9505, lng: -110.9747 });
          }
        }
      }
      await Promise.all([refetchAvailable(), refetchAll(), refetchConnect()]);
    } catch {
    } finally {
      setRefreshing(false);
    }
  }, [refetchAvailable, refetchAll, refetchConnect, driverLocation.lat]);

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
      {!search.trim() ? (
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

  if (user?.role === 'driver' && !isApproved) {
    return <DriverProfileStatusScreen />;
  }

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
            driverAtCapacity={atCapacity}
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
