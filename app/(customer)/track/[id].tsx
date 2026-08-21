import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { blink } from '@/lib/blink';
import { APP_CONFIG } from '@/lib/config';
import { useToast, CustomSkeleton } from '@/components/core';
import { colors } from '@/constants/design';
import {
  TrackHeroCard,
  TrackTimelineCard,
  TrackDriverCard,
  TrackRouteCard,
  CustomerOrderChat,
  TrackTestToolbar,
  type TrackHeroTheme,
} from '@/components/track';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

const TEST_DRIVERS = [
  { name: 'Marcus Johnson', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop' },
  { name: 'Sarah Kim', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop' },
  { name: 'David Torres', photo: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop' },
];

const CHANNEL_NAME = 'order-updates';

interface TrackedOrder {
  id: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  pickup_address?: string;
  pickupAddress?: string;
  delivery_address?: string;
  deliveryAddress?: string;
  items?: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered';
  created_at?: string;
  createdAt?: string;
  driver_name?: string;
  driverName?: string;
  driver_photo_url?: string;
  driverPhotoUrl?: string;
  tip_amount?: number;
  tipAmount?: number;
  distance_miles?: number;
  distanceMiles?: number;
  delivery_photo_url?: string;
  deliveryPhotoUrl?: string;
  payment_status?: string;
}

export default function TrackOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

  const channelRef = useRef<any>(null);
  const { showToast } = useToast();

  const fetchOrder = useCallback(
    async (isManualRefresh = false) => {
      if (!id) return;
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        let foundOrder: any = null;
        try {
          const raw = await AsyncStorage.getItem('customer_local_orders');
          if (raw) {
            const list: TrackedOrder[] = JSON.parse(raw);
            foundOrder = list.find((o) => o.id === id);
          }
        } catch {}

        if (!foundOrder) {
          try {
            foundOrder = await blink.db.orders.get(id);
          } catch {}
        }

        if (foundOrder) {
          setOrder({
            id: foundOrder.id,
            status: foundOrder.status || 'pending',
            customerName: foundOrder.customerName || foundOrder.customer_name || 'Customer',
            customerPhone: foundOrder.customerPhone || foundOrder.customer_phone,
            pickupAddress: foundOrder.pickupAddress || foundOrder.pickup_address,
            deliveryAddress: foundOrder.deliveryAddress || foundOrder.delivery_address,
            items: foundOrder.items,
            createdAt: foundOrder.createdAt || foundOrder.created_at,
            driverName: foundOrder.driverName || foundOrder.driver_name,
            driverPhotoUrl: foundOrder.driverPhotoUrl || foundOrder.driver_photo_url,
            deliveryPhotoUrl: foundOrder.deliveryPhotoUrl || foundOrder.delivery_photo_url,
          });
        }
      } catch (e: any) {
        console.error('[TrackOrder] Fetch error:', e?.message || e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  const handleAssignTestDriver = async () => {
    if (!id || !order) return;
    setTestBusy(true);
    haptic();
    try {
      const driver = TEST_DRIVERS[Math.floor(Math.random() * TEST_DRIVERS.length)];
      await blink.db.orders
        .update(id, {
          driver_name: driver.name,
          driver_photo_url: driver.photo,
          status: 'accepted',
        })
        .catch(() => {});

      const updated: TrackedOrder = {
        ...order,
        driver_name: driver.name,
        driverName: driver.name,
        driver_photo_url: driver.photo,
        driverPhotoUrl: driver.photo,
        status: 'accepted',
      };
      setOrder(updated);

      try {
        const raw = await AsyncStorage.getItem('customer_local_orders');
        if (raw) {
          const list: TrackedOrder[] = JSON.parse(raw);
          const idx = list.findIndex((o) => o.id === id);
          if (idx >= 0) {
            list[idx] = updated;
            await AsyncStorage.setItem('customer_local_orders', JSON.stringify(list));
          }
        }
      } catch {}

      showToast('Driver assigned!', {
        type: 'success',
        description: `${driver.name} is on the way to pick up your order.`,
      });
    } finally {
      setTestBusy(false);
    }
  };

  const handleTestDeliver = async () => {
    if (!id || !order) return;
    setTestBusy(true);
    haptic();
    try {
      const samplePhoto =
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop';
      await blink.db.orders
        .update(id, {
          status: 'delivered',
          delivery_photo_url: samplePhoto,
        })
        .catch(() => {});

      const updated: TrackedOrder = {
        ...order,
        status: 'delivered',
        delivery_photo_url: samplePhoto,
        deliveryPhotoUrl: samplePhoto,
      };
      setOrder(updated);

      try {
        const raw = await AsyncStorage.getItem('customer_local_orders');
        if (raw) {
          const list: TrackedOrder[] = JSON.parse(raw);
          const idx = list.findIndex((o) => o.id === id);
          if (idx >= 0) {
            list[idx] = updated;
            await AsyncStorage.setItem('customer_local_orders', JSON.stringify(list));
          }
        }
      } catch {}

      showToast('Delivery completed!', {
        type: 'success',
        description: 'Package has been delivered to your address.',
      });
    } finally {
      setTestBusy(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Real-time subscription
  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const connect = async () => {
      try {
        const channel = blink.realtime.channel(CHANNEL_NAME);
        channelRef.current = channel;
        await channel.subscribe({ userId: `track-${id}` });
        if (!mounted) return;
        setIsConnected(true);
        channel.onMessage((msg: any) => {
          if (!mounted) return;
          if (msg.type === 'order-changed' || msg.type === 'order:status_change') {
            fetchOrder();
          }
        });
      } catch {
        if (mounted) setIsConnected(false);
      }
    };

    connect();
    return () => {
      mounted = false;
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch {}
      }
    };
  }, [id, fetchOrder]);

  const shortId = order?.id ? order.id.slice(-6).toUpperCase() : '------';
  const customerName = order?.customerName || order?.customer_name || 'Customer';
  const pickupAddress = order?.pickupAddress || order?.pickup_address || APP_CONFIG.STORE_ADDRESS || 'Store Pickup';
  const deliveryAddress = order?.deliveryAddress || order?.delivery_address || '—';
  const createdAt = order?.createdAt || order?.created_at;

  const currentStatus = order?.status || 'pending';
  const isDelivered = currentStatus === 'delivered';
  const isAccepted = currentStatus === 'accepted';
  const isPickedUp = currentStatus === 'picked_up';

  const driverName = order?.driverName || order?.driver_name;
  const driverPhoto = order?.driverPhotoUrl || order?.driver_photo_url;
  const deliveryPhoto = order?.deliveryPhotoUrl || order?.delivery_photo_url;

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.header}>
          <CustomSkeleton width={42} height={42} borderRadius={12} />
          <View style={{ alignItems: 'center', gap: 6 }}>
            <CustomSkeleton width={130} height={18} borderRadius={6} />
            <CustomSkeleton width={80} height={12} borderRadius={4} />
          </View>
          <CustomSkeleton width={42} height={42} borderRadius={12} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroCardSkeleton, { backgroundColor: colors.glassLevel2Bg, borderColor: colors.glassLevel2Border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <CustomSkeleton width={48} height={48} circle />
              <View style={{ flex: 1, gap: 6 }}>
                <CustomSkeleton width={140} height={20} borderRadius={6} />
                <CustomSkeleton width="90%" height={12} borderRadius={4} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <MaterialIcons name="error-outline" size={48} color={colors.warning} />
        <Text style={styles.notFoundTitle}>Order Not Found</Text>
        <Text style={styles.notFoundSubtitle}>We couldn't locate this order request.</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(customer)/my-orders')}
          style={styles.primaryActionBtn}
        >
          <Text style={styles.primaryActionBtnText}>Back to My Orders</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getHeroTheme = (): TrackHeroTheme => {
    if (isDelivered) {
      return {
        icon: 'check-circle',
        title: 'Delivered ✓',
        desc: 'Your package has been successfully delivered.',
        color: colors.tertiary,
        bg: colors.greenAlpha10,
        border: colors.greenAlpha30,
        iconBg: colors.greenAlpha15,
      };
    }
    if (isPickedUp) {
      return {
        icon: 'local-shipping',
        title: 'Out For Delivery',
        desc: 'Your driver has picked up the order and is heading to you.',
        color: colors.secondary,
        bg: colors.accentAlpha12,
        border: colors.accentAlpha30,
        iconBg: colors.accentAlpha20,
      };
    }
    if (isAccepted || driverName) {
      return {
        icon: 'near-me',
        title: 'Driver On The Way',
        desc: `${driverName || 'A driver'} is heading to pick up your order.`,
        color: colors.primary,
        bg: colors.primaryAlpha12,
        border: colors.primaryAlpha30,
        iconBg: colors.primaryAlpha20,
      };
    }
    return {
      icon: 'access-time',
      title: 'Order Placed',
      desc: 'Searching for an available driver in your area...',
      color: colors.secondary,
      bg: colors.accentAlpha12,
      border: colors.accentAlpha30,
      iconBg: colors.accentAlpha20,
    };
  };

  const hero = getHeroTheme();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            haptic();
            router.replace('/(customer)/my-orders');
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
        >
          <MaterialIcons name="chevron-left" size={28} color={colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Track Order</Text>
          <Text style={styles.headerOrderId}>#{shortId}</Text>
        </View>

        <View style={styles.liveBadge}>
          <View
            style={[
              styles.livePulseDot,
              { backgroundColor: isConnected ? colors.tertiary : colors.outline },
            ]}
          />
          <Text
            style={[
              styles.liveBadgeText,
              { color: isConnected ? colors.tertiary : colors.outline },
            ]}
          >
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrder(true)}
            tintColor={colors.secondary}
          />
        }
      >
        {/* Status Hero Card */}
        <Animated.View entering={FadeInDown.springify()}>
          <TrackHeroCard
            hero={hero}
            isDelivered={isDelivered}
            deliveryPhoto={deliveryPhoto}
          />
        </Animated.View>

        {/* Order Status Timeline */}
        <Animated.View entering={FadeInDown.delay(70).springify()}>
          <TrackTimelineCard
            status={currentStatus}
            driverName={driverName}
            createdAt={createdAt}
          />
        </Animated.View>

        {/* Assigned Driver Card */}
        {!!driverName && (
          <Animated.View entering={FadeInDown.delay(130).springify()}>
            <TrackDriverCard
              driverName={driverName}
              driverPhoto={driverPhoto}
              driverPhone={order.customerPhone}
              isPickedUp={isPickedUp}
            />
          </Animated.View>
        )}

        {/* Route Details Card */}
        <Animated.View entering={FadeInDown.delay(180).springify()}>
          <TrackRouteCard
            pickupAddress={pickupAddress}
            deliveryAddress={deliveryAddress}
            items={order.items}
          />
        </Animated.View>

        {/* In-app Direct Driver Chat */}
        {!!driverName && !isDelivered && (
          <Animated.View entering={FadeInDown.delay(220).springify()}>
            <CustomerOrderChat orderId={id!} customerName={customerName} />
          </Animated.View>
        )}

        {/* Demo Simulation Controls */}
        {!isDelivered && (
          <Animated.View entering={FadeInDown.delay(260).springify()}>
            <TrackTestToolbar
              testBusy={testBusy}
              hasDriver={!!driverName}
              onAssignDriver={handleAssignTestDriver}
              onCompleteDelivery={handleTestDeliver}
            />
          </Animated.View>
        )}

        {/* Navigation Action Buttons */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.footerButtons}>
          <TouchableOpacity
            onPress={() => {
              haptic();
              router.replace('/(customer)/my-orders');
            }}
            activeOpacity={0.85}
            style={styles.primaryBlueBtn}
          >
            <MaterialIcons name="list-alt" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBlueBtnText}>View All My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              haptic();
              router.replace('/(customer)');
            }}
            activeOpacity={0.85}
            style={styles.secondaryOutlineBtn}
          >
            <MaterialIcons name="add" size={20} color={colors.onSurface} />
            <Text style={styles.secondaryOutlineBtnText}>Request Another Pickup</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
  },
  notFoundSubtitle: {
    fontSize: 14,
    color: colors.outline,
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryActionBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 64 : 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassLevel2Border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
  },
  headerOrderId: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.outline,
    marginTop: 1,
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.greenAlpha15,
    borderWidth: 1,
    borderColor: colors.greenAlpha40,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.tertiary,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.tertiary,
    letterSpacing: 0.8,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  heroCardSkeleton: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
  },
  footerButtons: {
    gap: 12,
    marginTop: 8,
  },
  primaryBlueBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBlueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryOutlineBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryOutlineBtnText: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
});