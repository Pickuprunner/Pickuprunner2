import React, { useState, useMemo } from 'react';
import { Platform, StyleSheet, View, StatusBar } from 'react-native';
import { router } from 'expo-router';

import { useOrders, useAvailableOrders, Order, useUpdateOrderStatus } from '@/lib/orders';
import { useOrdersRealtime } from '@/lib/realtime';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { useDriverQueue } from '@/lib/driverQueue';
import { useDriverId } from '@/hooks/useDriverId';
import { useAuth } from '@/hooks/useAuth';

import {
  WebMap,
  NativeMap,
  MapSelectedCard,
  MapStopsCarousel,
  haptic,
  BG,
} from '@/components/map';

export default function MapScreen() {
  const { data: availableOrders = [] } = useAvailableOrders();
  const { data: allOrders = [] } = useOrders();
  const { isConnected } = useOrdersRealtime();
  const updateStatus = useUpdateOrderStatus();
  const driverId = useDriverId();
  const { user } = useAuth();

  const orders = useMemo(() => {
    const orderMap = new Map<string, Order>();
    (availableOrders || []).forEach((o) => o?.id && orderMap.set(o.id, o));
    (allOrders || []).forEach((o) => {
      if (o?.id && ((o.driverUserId === driverId) || o.status !== 'delivered')) {
        orderMap.set(o.id, { ...(orderMap.get(o.id) || {}), ...o });
      }
    });
    return Array.from(orderMap.values());
  }, [availableOrders, allOrders, driverId]);

  const { isMyOrder } = useDriverQueue(orders, driverId);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);
  const activeOrders = useMemo(
    () => orders.filter((o) => isMyOrder(o.id) && (o.status === 'accepted' || o.status === 'picked_up')),
    [orders, isMyOrder]
  );

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedId),
    [orders, selectedId]
  );

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
          <WebMap orders={orders} selectedId={selectedId} onSelect={setSelectedId} />
        ) : (
          <NativeMap orders={orders} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </View>
      <View style={styles.bottomSection}>
        {selectedOrder ? (
          <MapSelectedCard
            selectedOrder={selectedOrder}
            onClose={() => setSelectedId(null)}
            onAccept={handleAcceptOrder}
            onOpenOrder={handleOpenOrder}
          />
        ) : (
          <MapStopsCarousel
            pendingOrders={pendingOrders}
            activeOrders={activeOrders}
            selectedId={selectedId}
            isConnected={isConnected}
            onSelectId={setSelectedId}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    position: 'relative',
  },
  mapWrapper: {
    flex: 1,
    minHeight: 240,
    position: 'relative',
  },
  bottomSection: {
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
});
