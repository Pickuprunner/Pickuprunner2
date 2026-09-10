import React, { useState, useMemo, useEffect } from 'react';
import { Platform, StyleSheet, View, StatusBar } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';

import { useOrders, useAvailableOrders, Order, useUpdateOrderStatus } from '@/lib/orders';
import { haversineMiles } from '@/lib/locationCalculations';
import { useOrdersRealtime } from '@/lib/realtime';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { useDriverQueue } from '@/lib/driverQueue';
import { useDriverId } from '@/hooks/useDriverId';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/constants/design';
import { APP_CONFIG } from '@/lib/config';

import {
  WebMap,
  NativeMap,
  MapSelectedCard,
  MapStopsCarousel,
  haptic,
} from '@/components/map';

export default function MapScreen() {
  const [driverLocation, setDriverLocation] = useState<{ lat?: number; lng?: number }>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const last = await Location.getLastKnownPositionAsync().catch(() => null);
        if (mounted && last?.coords) {
          setDriverLocation({ lat: last.coords.latitude, lng: last.coords.longitude });
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
        if (mounted && pos?.coords) {
          setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const { data: availableOrders = [] } = useAvailableOrders({
    lat: driverLocation.lat,
    lng: driverLocation.lng,
    radiusMiles: APP_CONFIG.MAX_DELIVERY_RADIUS_MILES,
  });
  const { data: allOrders = [] } = useOrders();
  const { isConnected } = useOrdersRealtime();
  const updateStatus = useUpdateOrderStatus();
  const driverId = useDriverId();
  const { user } = useAuth();

  const orders = useMemo(() => {
    const orderMap = new Map<string, Order>();
    (availableOrders || []).forEach((o) => {
      if (o?.id && o.status === 'pending') {
        if (driverLocation.lat != null && driverLocation.lng != null) {
          const pLat = o.pickupLat ?? (o as any).pickup_lat;
          const pLng = o.pickupLng ?? (o as any).pickup_lng;
          if (
            pLat != null &&
            pLng != null &&
            haversineMiles(driverLocation.lat, driverLocation.lng, Number(pLat), Number(pLng)) >
              APP_CONFIG.MAX_DELIVERY_RADIUS_MILES
          ) {
            return;
          }
        }
        orderMap.set(o.id, o);
      }
    });
    (allOrders || []).forEach((o) => {
      if (!o?.id) return;
      const isMyActive = o.driverUserId === driverId && (o.status === 'accepted' || o.status === 'picked_up');
      const isPending = o.status === 'pending';
      if (isMyActive || isPending) {
        orderMap.set(o.id, { ...(orderMap.get(o.id) || {}), ...o });
      }
    });
    return Array.from(orderMap.values());
  }, [availableOrders, allOrders, driverId, driverLocation.lat, driverLocation.lng]);

  const { isMyOrder } = useDriverQueue(orders, driverId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'active' | 'pending'>('pending');

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);
  const activeOrders = useMemo(
    () => orders.filter((o) => isMyOrder(o.id) && (o.status === 'accepted' || o.status === 'picked_up')),
    [orders, isMyOrder]
  );

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedId),
    [orders, selectedId]
  );

  const handleSelectId = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      const order = orders.find((o) => o.id === id);
      if (order?.status === 'pending') {
        setCurrentTab('pending');
      } else if (order?.status === 'accepted' || order?.status === 'picked_up') {
        setCurrentTab('active');
      }
    }
  };

  const handleOpenOrder = (order: Order) => {
    haptic('medium');
    setSelectedOrder(order);
    router.push(`/order/${order.id}`);
  };

  const handleAcceptOrder = async (order: Order) => {
    if (!order.id) return;
    haptic('heavy');
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        status: 'accepted',
        driverUserId: driverId,
        driverName: user?.displayName ?? user?.email ?? 'Driver',
      });
      setSelectedOrder({ ...order, status: 'accepted', driverUserId: driverId });
      router.push(`/order/${order.id}`);
    } catch (err: any) {
      console.error('[MapScreen] Failed to accept order:', err);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.mapWrapper}>
        {Platform.OS === 'web' ? (
          <WebMap
            orders={orders}
            selectedId={selectedId}
            onSelect={handleSelectId}
            currentTab={currentTab}
            driverLocation={driverLocation}
          />
        ) : (
          <NativeMap
            orders={orders}
            selectedId={selectedId}
            onSelect={handleSelectId}
            currentTab={currentTab}
            driverLocation={driverLocation}
          />
        )}
      </View>
      <View style={styles.bottomSection}>
        {selectedOrder ? (
          <MapSelectedCard
            selectedOrder={selectedOrder}
            onClose={() => handleSelectId(null)}
            onAccept={handleAcceptOrder}
            onOpenOrder={handleOpenOrder}
          />
        ) : (
          <MapStopsCarousel
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            pendingOrders={pendingOrders}
            activeOrders={activeOrders}
            selectedId={selectedId}
            isConnected={isConnected}
            onSelectId={handleSelectId}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  mapWrapper: {
    flex: 1,
    minHeight: 240,
    position: 'relative',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'stretch',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.glassLevel2Border,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
});

