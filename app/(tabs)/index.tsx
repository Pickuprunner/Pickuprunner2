import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  StyleSheet,
  View,
  Text,
  Platform,
  LayoutChangeEvent,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import {
  Package,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { useOrders, useAvailableOrders, useUpdateOrderStatus, useClaimOrder } from '@/lib/orders';
import { useOrderStore } from '@/store/useOrderStore';
import { useDriverStore } from '@/store/useDriverStore';
import { useOrdersRealtime } from '@/lib/realtime';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { useAuth } from '@/hooks/useAuth';
import { useDriverQueue } from '@/lib/driverQueue';
import { useDriverId } from '@/hooks/useDriverId';
import { useMyVerification } from '@/lib/verification';
import { useDriverAccreditation } from '@/lib/accreditation';
import { useDriverAvailability, useSetDriverAvailability, useDriverLocationHeartbeat } from '@/lib/availability';
import { useConnectStatus, useConnectOnboard, openStripeOnboardingSession } from '@/lib/stripeConnect';
import { SkeletonList, StripeSetupBanner, CustomConfirmModal, useToast, CustomLoading, CustomRefreshControl } from '@/components/core';

import { isAccreditationFullyApproved } from '@/apis/accreditation';
import {
  OrdersHeader,
  OrdersSearchBar,
  DriverOrderCard,
  ActiveDeliveriesBanner,
} from '@/components/Orders';
import { DriverProfileStatusScreen } from '@/components/driver-verification';
import { DriverOfflineView } from '@/components/driver';
import { useNetworkStatus } from '@/lib/network';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  }
}

export default function OrdersScreen() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [driverLocation, setDriverLocation] = useState<{ lat?: number; lng?: number }>({});
  const { isConnected: isNetworkConnected, isChecking: isCheckingNetwork, checkConnection } = useNetworkStatus();

  const [headerHeight, setHeaderHeight] = useState(200);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const accumDelta = useRef(0);
  const lastDirectionChangeTime = useRef(0);
  const isHeaderVisible = useRef(true);

  // Sync duty availability with backend
  useDriverAvailability();
  const setAvailabilityMutation = useSetDriverAvailability();

  useDriverLocationHeartbeat(driverLocation);

  useFocusEffect(
    useCallback(() => {
      let lastBackPress = 0;
      const onBackPress = () => {
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPress = now;
        showToast('Press back again to exit', 'info');
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [showToast])
  );

  useEffect(() => {
    let isMounted = true;

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
              (err) => {
                console.warn('[OrdersScreen] Geolocation error:', err);
              },
              { timeout: 8000, enableHighAccuracy: true }
            );
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
      } catch (err) {
        console.log('[OrdersScreen] GPS unavailable:', err);
      }
    }
    initLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  const { user } = useAuth();
  const driverId = useDriverId();
  const updateStatus = useUpdateOrderStatus();
  const claimOrder = useClaimOrder();
  const { data: connectStatus, refetch: refetchConnect } = useConnectStatus(driverId);
  const connectOnboard = useConnectOnboard();
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const isStripeReady = Boolean(connectStatus?.connected && connectStatus?.payoutsEnabled) || Boolean(user?.stripeAccountId);

  const { data: verification, isLoading: isLoadingVerif } = useMyVerification(user?.id);
  const { data: accreditation, isLoading: isLoadingAccred } = useDriverAccreditation();

  const isApproved = isAccreditationFullyApproved(accreditation);

  const isSubmitted =
    Boolean(accreditation?.profile?.isSubmitted) ||
    accreditation?.profile?.accreditationStatus === 'under_review' ||
    accreditation?.profile?.accreditationStatus === 'approved' ||
    verification?.status === 'pending';

  useEffect(() => {
    if (
      user?.role === 'driver' &&
      !isLoadingVerif &&
      !isLoadingAccred &&
      !isApproved &&
      !isSubmitted
    ) {
      router.replace('/(auth)/driver-verification');
    }
  }, [user?.role, isApproved, isSubmitted, isLoadingVerif, isLoadingAccred]);

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
      showToast('Daily Limit Reached', {
        type: 'warning',
        description: 'You have reached the maximum limit of 3 orders for today',
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
      await Promise.all([refetchAvailable(), refetchAll()]).catch(() => { });
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
  });
  const { data: allOrders = [], isLoading: isLoadingAll, refetch: refetchAll } = useOrders();
  const { isConnected } = useOrdersRealtime();

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

  const { queueCount, completedCount, atCapacity } = useDriverQueue(allOrders, driverId);

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
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (pos?.coords) {
                setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              }
            },
            (err) => console.warn('[OrdersScreen] Web refresh location error:', err)
          );
        }
      } else {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (pos?.coords) {
              setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            }
          }
        } catch (err) {
          console.warn('[OrdersScreen] Native refresh location error:', err);
        }
      }
      const minDelay = new Promise((resolve) => setTimeout(resolve, 550));
      await Promise.all([refetchAvailable(), refetchAll(), refetchConnect(), minDelay]);
    } catch {
    } finally {
      setRefreshing(false);
    }
  }, [refetchAvailable, refetchAll, refetchConnect]);

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
      } else if (accumDelta.current < -60 && !isHeaderVisible.current) {
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

  const isOnline = useDriverStore((s) => s.isOnline);

  const handleToggleDuty = (targetOnline: boolean) => {
    haptic();
    setAvailabilityMutation.mutate(targetOnline, {
      onSuccess: () => {
        showToast(
          targetOnline ? "You're now Online" : "You're now Offline",
          targetOnline ? 'success' : 'info'
        );
      },
      onError: () => {
        showToast('Failed to update duty availability', 'error');
      },
    });
  };

  const EmptyView = !isLoading ? (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <Package size={52} color="#FFE399" />
      </View>
      <Text style={styles.emptyTitle}>
        {search.trim() ? 'No Matching Orders' : 'No Available Orders'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {search.trim()
          ? 'Try adjusting your search query.'
          : 'New incoming deliveries will appear here in real time.'}
      </Text>
      {search.trim() ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSearch('')}
          style={styles.emptyActionBtn}
        >
          <Text style={styles.emptyActionBtnText}>Clear Search</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onRefresh}
          style={styles.emptyActionBtn}
        >
          <Text style={styles.emptyActionBtnText}>Refresh Feed</Text>
        </TouchableOpacity>
      )}
    </View>
  ) : null;

  if (user?.role === 'driver' && !isApproved) {
    return (
      <DriverProfileStatusScreen
        onEditDocuments={() => {
          router.push({
            pathname: '/(auth)/driver-verification',
            params: { edit: 'true', step: '1' },
          } as any);
        }}
        onEditStep={(step) => {
          router.push({
            pathname: '/(auth)/driver-verification',
            params: { edit: 'true', step: String(step) },
          } as any);
        }}
      />
    );
  }

  // 1. If phone data / network is disconnected (Wi-Fi or Mobile Data is OFF) -> Render Network Offline UI
  if (!isNetworkConnected) {
    return (
      <DriverOfflineView
        onRetry={checkConnection}
        isLoading={isCheckingNetwork}
        onOpenPreferences={() => router.push('/(tabs)/profile')}
        driverLocation={driverLocation}
        availableCount={orders.length}
        orders={orders}
        isNetworkOffline={true}
      />
    );
  }

  // 2. If driver manually set duty to Offline (from Profile screen or duty toggle) -> Render Duty Offline UI
  if (!isOnline) {
    return (
      <DriverOfflineView
        onGoOnline={() => handleToggleDuty(true)}
        isLoading={setAvailabilityMutation.isPending}
        onOpenPreferences={() => router.push('/(tabs)/profile')}
        driverLocation={driverLocation}
        availableCount={orders.length}
        orders={orders}
        isNetworkOffline={false}
      />
    );
  }

  // 3. Driver is Online and Network is Connected -> Directly render Orders Feed
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
          completedCount={completedCount}
          atCapacity={atCapacity}
          isConnected={isConnected}
          isOnline={isOnline}
          onToggleOnline={() => handleToggleDuty(!isOnline)}
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
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
