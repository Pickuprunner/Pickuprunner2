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
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { blink } from '@/lib/blink';
import { ordersApi } from '@/apis/orders';
import { createCheckoutForOrder, openCheckoutUrl } from '@/apis/checkout';
import { useOrderStore } from '@/store/useOrderStore';
import { useOrdersRealtime } from '@/lib/realtime';
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
  status: 'pending' | 'assigned' | 'accepted' | 'shopping' | 'picked_up' | 'en_route' | 'delivered' | 'cancelled' | string;
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
  paymentStatus?: string;
  amount_cents?: number;
  amountCents?: number;
}

export default function TrackOrderScreen() {
  const params = useLocalSearchParams<{
    id: string;
    deliveryAddress?: string;
    pickupAddress?: string;
    customerName?: string;
    customerPhone?: string;
    items?: string;
    status?: string;
  }>();
  const id = params.id;
  const storeOrder = useOrderStore((state) => state.orders.find((o) => o.id === id));

  const [order, setOrder] = useState<TrackedOrder | null>(() => {
    if (storeOrder) {
      return {
        id: storeOrder.id,
        status: (storeOrder.status as any) || (params.status as any) || 'pending',
        customerName: storeOrder.customerName || params.customerName || 'Customer',
        customerPhone: storeOrder.customerPhone || params.customerPhone,
        pickupAddress: storeOrder.pickupAddress || params.pickupAddress || APP_CONFIG.STORE_ADDRESS,
        pickup_address: storeOrder.pickupAddress || params.pickupAddress || APP_CONFIG.STORE_ADDRESS,
        deliveryAddress: storeOrder.deliveryAddress || params.deliveryAddress || '123 E Test Ave, Sahuarita, AZ 85629',
        delivery_address: storeOrder.deliveryAddress || params.deliveryAddress || '123 E Test Ave, Sahuarita, AZ 85629',
        items: storeOrder.items || params.items,
        driverName: storeOrder.driverName,
        driver_name: storeOrder.driverName,
        deliveryPhotoUrl: storeOrder.deliveryPhotoUrl,
      };
    }
    if (params.id && (params.deliveryAddress || params.pickupAddress || params.status)) {
      return {
        id: params.id,
        deliveryAddress: params.deliveryAddress || '123 E Test Ave, Sahuarita, AZ 85629',
        delivery_address: params.deliveryAddress || '123 E Test Ave, Sahuarita, AZ 85629',
        pickupAddress: params.pickupAddress || APP_CONFIG.STORE_ADDRESS,
        pickup_address: params.pickupAddress || APP_CONFIG.STORE_ADDRESS,
        customerName: params.customerName || 'Customer',
        customerPhone: params.customerPhone,
        items: params.items,
        status: (params.status as any) || 'pending',
        paymentStatus: (params as any)?.paymentStatus || (params as any)?.payment_status,
        payment_status: (params as any)?.paymentStatus || (params as any)?.payment_status,
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(!order);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [paying, setPaying] = useState(false);

  const channelRef = useRef<any>(null);
  const { showToast } = useToast();

  // Instant reactive update whenever driver changes status in store
  useEffect(() => {
    if (storeOrder) {
      setOrder((prev) => ({
        ...(prev || {}),
        id: storeOrder.id,
        status: (storeOrder.status as any) || prev?.status || 'pending',
        customerName: storeOrder.customerName || prev?.customerName || 'Customer',
        customerPhone: storeOrder.customerPhone || prev?.customerPhone,
        pickupAddress: storeOrder.pickupAddress || prev?.pickupAddress || APP_CONFIG.STORE_ADDRESS,
        pickup_address: storeOrder.pickupAddress || prev?.pickup_address || APP_CONFIG.STORE_ADDRESS,
        deliveryAddress: storeOrder.deliveryAddress || prev?.deliveryAddress || '123 E Test Ave, Sahuarita, AZ 85629',
        delivery_address: storeOrder.deliveryAddress || prev?.delivery_address || '123 E Test Ave, Sahuarita, AZ 85629',
        items: storeOrder.items || prev?.items,
        createdAt: storeOrder.createdAt || prev?.createdAt,
        driverName: storeOrder.driverName || prev?.driverName,
        driver_name: storeOrder.driverName || prev?.driver_name,
        driverPhotoUrl: storeOrder.deliveryPhotoUrl || prev?.driverPhotoUrl,
        driver_photo_url: storeOrder.deliveryPhotoUrl || prev?.driver_photo_url,
        deliveryPhotoUrl: storeOrder.deliveryPhotoUrl || prev?.deliveryPhotoUrl,
        delivery_photo_url: storeOrder.deliveryPhotoUrl || prev?.delivery_photo_url,
        paymentStatus: storeOrder.paymentStatus || storeOrder.payment_status || prev?.paymentStatus,
        payment_status: storeOrder.paymentStatus || storeOrder.payment_status || prev?.payment_status,
      }));
    }
  }, [storeOrder]);

  const initialParamsRef = useRef(params);
  const fetchOrderRef = useRef<((isManualRefresh?: boolean) => Promise<void>) | null>(null);

  const fetchOrder = useCallback(
    async (isManualRefresh = false) => {
      if (!id) return;
      if (isManualRefresh) setRefreshing(true);
      else if (!order) setLoading(true);

      const p = initialParamsRef.current;

      try {
        const storeCurrent = useOrderStore.getState().orders.find((o) => o.id === id);
        let foundOrder: any = null;

        // 1. Fetch from backend API GET /orders/:id
        try {
          const remote = await ordersApi.getById(id);
          if (remote && remote.id) {
            foundOrder = remote;
            useOrderStore.getState().upsertOrder(remote);
          }
        } catch (apiErr) {
          console.warn(`[TrackOrder] GET /orders/${id} failed, trying local:`, apiErr);
        }

        // 2. Fallback to Zustand store
        if (!foundOrder && storeCurrent) {
          foundOrder = storeCurrent;
        }

        // 3. Fallback to AsyncStorage
        if (!foundOrder) {
          try {
            const raw = await AsyncStorage.getItem('customer_local_orders');
            if (raw) {
              const list: TrackedOrder[] = JSON.parse(raw);
              const fromLocal = list.find((o) => o.id === id);
              if (fromLocal) {
                foundOrder = fromLocal;
              }
            }
          } catch {}
        }

        // 4. Fallback to Blink DB
        if (!foundOrder) {
          try {
            foundOrder = await blink.db.orders.get(id);
          } catch {}
        }

        const resolvedDelivery =
          foundOrder?.deliveryAddress ||
          foundOrder?.delivery_address ||
          foundOrder?.delivery ||
          foundOrder?.dropoffAddress ||
          foundOrder?.dropoff_address ||
          foundOrder?.destination ||
          foundOrder?.address ||
          storeCurrent?.deliveryAddress ||
          p?.deliveryAddress ||
          '123 E Test Ave, Sahuarita, AZ 85629';

        const resolvedPickup =
          foundOrder?.pickupAddress ||
          foundOrder?.pickup_address ||
          foundOrder?.pickup ||
          storeCurrent?.pickupAddress ||
          p?.pickupAddress ||
          APP_CONFIG.STORE_ADDRESS;

        if (foundOrder || storeCurrent || p?.id) {
          const candidateStatus =
            foundOrder?.status ||
            storeCurrent?.status ||
            (p?.status as any);

          const effectiveStatus =
            candidateStatus && candidateStatus !== 'pending'
              ? candidateStatus
              : (storeCurrent?.status || foundOrder?.status || (p?.status as any) || 'pending');

          setOrder({
            id: foundOrder?.id || storeCurrent?.id || p?.id,
            status: effectiveStatus as any,
            customerName:
              foundOrder?.customerName ||
              foundOrder?.customer_name ||
              storeCurrent?.customerName ||
              p?.customerName ||
              'Customer',
            customerPhone:
              foundOrder?.customerPhone ||
              foundOrder?.customer_phone ||
              storeCurrent?.customerPhone ||
              p?.customerPhone,
            pickupAddress: resolvedPickup,
            pickup_address: resolvedPickup,
            deliveryAddress: resolvedDelivery,
            delivery_address: resolvedDelivery,
            items: foundOrder?.items || storeCurrent?.items || p?.items,
            createdAt: foundOrder?.createdAt || foundOrder?.created_at || storeCurrent?.createdAt,
            driverName: foundOrder?.driverName || foundOrder?.driver_name || storeCurrent?.driverName,
            driverPhotoUrl:
              foundOrder?.driverPhotoUrl || foundOrder?.driver_photo_url || storeCurrent?.deliveryPhotoUrl,
            deliveryPhotoUrl:
              foundOrder?.deliveryPhotoUrl || foundOrder?.delivery_photo_url || storeCurrent?.deliveryPhotoUrl,
            paymentStatus: foundOrder?.paymentStatus || foundOrder?.payment_status || storeCurrent?.paymentStatus || storeCurrent?.payment_status,
            payment_status: foundOrder?.payment_status || foundOrder?.paymentStatus || storeCurrent?.payment_status || storeCurrent?.paymentStatus,
          });

          // Sync fresh status to customer_local_orders in AsyncStorage
          try {
            const raw = await AsyncStorage.getItem('customer_local_orders');
            if (raw) {
              const list = JSON.parse(raw);
              const index = list.findIndex((o: any) => o.id === (foundOrder?.id || id));
              if (index !== -1) {
                list[index] = {
                  ...list[index],
                  status: effectiveStatus,
                  driverName: foundOrder?.driverName || foundOrder?.driver_name || storeCurrent?.driverName,
                  driver_name: foundOrder?.driverName || foundOrder?.driver_name || storeCurrent?.driverName,
                  deliveryPhotoUrl: foundOrder?.deliveryPhotoUrl || storeCurrent?.deliveryPhotoUrl,
                };
                await AsyncStorage.setItem('customer_local_orders', JSON.stringify(list));
              }
            }
          } catch {}
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

  useEffect(() => {
    fetchOrderRef.current = fetchOrder;
  }, [fetchOrder]);

  const handleAssignTestDriver = async () => {
    if (!id || !order) return;
    setTestBusy(true);
    haptic();
    try {
      const driver = TEST_DRIVERS[Math.floor(Math.random() * TEST_DRIVERS.length)];
      
      // Update backend via PATCH /orders/:id
      try {
        await ordersApi.update(id, {
          driverName: driver.name,
          status: 'accepted',
        });
      } catch (err) {
        console.warn('[TrackOrder] ordersApi.update failed:', err);
      }

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
      useOrderStore.getState().updateOrder(id, { status: 'accepted', driverName: driver.name });

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

      // Update backend via PATCH /orders/:id
      try {
        await ordersApi.update(id, {
          status: 'delivered',
          deliveryPhotoUrl: samplePhoto,
        });
      } catch (err) {
        console.warn('[TrackOrder] ordersApi.update deliver failed:', err);
      }

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
      useOrderStore.getState().updateOrder(id, { status: 'delivered', deliveryPhotoUrl: samplePhoto });

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
  }, [id]);

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
            fetchOrderRef.current?.();
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
  }, [id]);

  const shortId = order?.id ? order.id.slice(-6).toUpperCase() : '------';
  const customerName = order?.customerName || order?.customer_name || 'Customer';
  const pickupAddress =
    order?.pickupAddress ||
    order?.pickup_address ||
    (order as any)?.pickup ||
    params.pickupAddress ||
    APP_CONFIG.STORE_ADDRESS ||
    'Store Pickup';
  const deliveryAddress =
    order?.deliveryAddress ||
    order?.delivery_address ||
    (order as any)?.delivery ||
    (order as any)?.dropoffAddress ||
    (order as any)?.dropoff_address ||
    (order as any)?.destination ||
    (order as any)?.address ||
    params.deliveryAddress ||
    '123 E Test Ave, Sahuarita, AZ 85629';
  const createdAt = order?.createdAt || order?.created_at;

  const currentStatus = order?.status || 'pending';
  const isDelivered = currentStatus === 'delivered';
  const isAccepted = currentStatus === 'accepted';
  const isPickedUp = currentStatus === 'picked_up';

  const driverName = order?.driverName || order?.driver_name;
  const driverPhoto = order?.driverPhotoUrl || order?.driver_photo_url;
  const deliveryPhoto = order?.deliveryPhotoUrl || order?.delivery_photo_url;

  const DELIVERY_FEE = APP_CONFIG.DELIVERY_FEE_CENTS;
  const MILEAGE_FREE_MILES = APP_CONFIG.FREE_MILES;
  const MILEAGE_RATE_CENTS = APP_CONFIG.MILEAGE_RATE_CENTS;

  const miles = Number(order?.distanceMiles ?? order?.distance_miles ?? 0);
  const tipAmount = Number(order?.tipAmount ?? order?.tip_amount ?? 500);
  const mileageCents = miles > MILEAGE_FREE_MILES ? Math.round((miles - MILEAGE_FREE_MILES) * MILEAGE_RATE_CENTS) : 0;
  const totalCents = DELIVERY_FEE + mileageCents + tipAmount;

  const isPaid =
    order?.payment_status === 'paid' ||
    order?.payment_status === 'test_paid' ||
    (order as any)?.paymentStatus === 'paid' ||
    (order as any)?.paymentStatus === 'test_paid';

  const isChargeable =
    currentStatus !== 'pending' &&
    currentStatus !== 'assigned' &&
    currentStatus !== 'cancelled';

  const needsPayment = isChargeable && !isPaid;

  const handlePayNow = async () => {
    if (!id || paying) return;
    haptic();
    setPaying(true);
    try {
      const res = await createCheckoutForOrder(id, {
        amountCents: totalCents,
        customerEmail: (order as any)?.customerEmail || (order as any)?.customer_email,
        testMode: true,
      });
      if (res?.url) {
        await openCheckoutUrl(res.url);
        // Refresh order status immediately upon returning from checkout
        await fetchOrder(true);
      } else {
        showToast(res?.error || 'Could not create checkout session', { type: 'error' });
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to initiate payment', { type: 'error' });
    } finally {
      setPaying(false);
    }
  };

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

        {/* Payment Banner (When Driver has Accepted & Order is Chargeable) */}
        {needsPayment && (
          <Animated.View entering={FadeInDown.delay(40).springify()}>
            <View style={styles.paymentBanner}>
              <View style={styles.paymentBannerLeft}>
                <View style={styles.paymentIconCircle}>
                  <MaterialIcons name="credit-card" size={20} color="#00E297" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentBannerTitle}>Payment Ready</Text>
                  <Text style={styles.paymentBannerSub}>
                    Driver assigned. Total: ${(totalCents / 100).toFixed(2)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handlePayNow}
                disabled={paying}
                activeOpacity={0.85}
                style={styles.payNowBtn}
              >
                {paying ? (
                  <ActivityIndicator size="small" color="#0F131C" />
                ) : (
                  <>
                    <MaterialIcons name="lock" size={16} color="#0F131C" />
                    <Text style={styles.payNowBtnText}>Pay Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {isPaid && (
          <Animated.View entering={FadeInDown.delay(40).springify()}>
            <View style={[styles.paymentBanner, { borderColor: 'rgba(0, 226, 151, 0.35)', backgroundColor: 'rgba(0, 226, 151, 0.08)' }]}>
              <View style={styles.paymentBannerLeft}>
                <View style={[styles.paymentIconCircle, { backgroundColor: 'rgba(0, 226, 151, 0.2)' }]}>
                  <MaterialIcons name="check-circle" size={20} color="#00E297" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentBannerTitle, { color: '#00E297' }]}>Payment Confirmed</Text>
                  <Text style={styles.paymentBannerSub}>
                    Paid via Stripe · ${(totalCents / 100).toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(0, 226, 151, 0.15)', borderWidth: 1, borderColor: '#00E297' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#00E297', letterSpacing: 0.5 }}> PAID</Text>
              </View>
            </View>
          </Animated.View>
        )}

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
  paymentBanner: {
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 226, 151, 0.35)',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  paymentIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 226, 151, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBannerTitle: {
    color: '#00E297',
    fontSize: 14,
    fontWeight: '800',
  },
  paymentBannerSub: {
    color: '#c2c6d8',
    fontSize: 12,
    marginTop: 2,
  },
  payNowBtn: {
    backgroundColor: '#00E297',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: 'rgba(0, 226, 151, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  payNowBtnText: {
    color: '#0F131C',
    fontSize: 13,
    fontWeight: '800',
  },
});