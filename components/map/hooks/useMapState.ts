import { useState, useMemo, useEffect } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';

import { useOrders, useAvailableOrders, Order, useUpdateOrderStatus } from '@/lib/orders';
import { haversineMiles } from '@/lib/locationCalculations';
import { useOrdersRealtime } from '@/lib/realtime';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { useDriverQueue, MAX_QUEUE, ACTIVE_STATUSES } from '@/lib/driverQueue';
import { useDriverId } from '@/hooks/useDriverId';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/core';
import { APP_CONFIG } from '@/lib/config';
import { useOrderStore } from '@/store/useOrderStore';
import { useLocationStore } from '@/store/useLocationStore';
import { haptic, getPickupCoords, getDeliveryCoords } from '../mapTypes';

export function useMapState() {
  const storedLocation = useLocationStore((state) => state.currentLocation);
  const [driverLocation, setDriverLocation] = useState<{ lat?: number; lng?: number }>(() =>
    storedLocation ? { lat: storedLocation.lat, lng: storedLocation.lon } : {}
  );

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

  const effectiveDriverLocation = useMemo(() => {
    if (driverLocation.lat != null && driverLocation.lng != null) {
      return driverLocation;
    }
    if (storedLocation?.lat != null && storedLocation?.lon != null) {
      return { lat: storedLocation.lat, lng: storedLocation.lon };
    }
    return driverLocation;
  }, [driverLocation, storedLocation]);

  const { data: availableOrders = [] } = useAvailableOrders({
    lat: effectiveDriverLocation.lat,
    lng: effectiveDriverLocation.lng,
    radiusMiles: APP_CONFIG.MAX_DELIVERY_RADIUS_MILES,
  });
  const { data: allOrders = [] } = useOrders();
  const storeOrders = useOrderStore((state) => state.orders);
  const { isConnected } = useOrdersRealtime();
  const updateStatus = useUpdateOrderStatus();
  const driverId = useDriverId();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'active' | 'pending'>('pending');

  const orders = useMemo(() => {
    const orderMap = new Map<string, Order>();

    (allOrders || []).forEach((o) => {
      if (!o?.id) return;
      if (o.driverUserId === driverId && ACTIVE_STATUSES.includes(o.status)) {
        orderMap.set(o.id, o);
      }
    });

    (storeOrders || []).forEach((o) => {
      if (!o?.id) return;
      if (o.driverUserId === driverId && ACTIVE_STATUSES.includes(o.status) && !orderMap.has(o.id)) {
        orderMap.set(o.id, o);
      }
    });

    const activeOrClaimedIds = new Set(
      [...(allOrders || []), ...(storeOrders || [])]
        .filter((o) => o.status !== 'pending' || !!o.driverUserId)
        .map((o) => o.id)
    );

    const candidatePending = [
      ...(availableOrders || []),
      ...(storeOrders || []).filter((o) => o.status === 'pending' && !o.driverUserId),
      ...(allOrders || []).filter((o) => o.status === 'pending' && !o.driverUserId),
    ];

    candidatePending.forEach((o) => {
      if (!o?.id || o.status !== 'pending' || o.driverUserId || activeOrClaimedIds.has(o.id)) {
        return;
      }
      const coords = getPickupCoords(o) || getDeliveryCoords(o);
      if (effectiveDriverLocation.lat != null && effectiveDriverLocation.lng != null && coords) {
        const dist = haversineMiles(effectiveDriverLocation.lat, effectiveDriverLocation.lng, coords.lat, coords.lng);
        if (dist > APP_CONFIG.MAX_DELIVERY_RADIUS_MILES) {
          return;
        }
      } else if (o.distanceMiles && Number(o.distanceMiles) > APP_CONFIG.MAX_DELIVERY_RADIUS_MILES) {
        return;
      }
      if (!orderMap.has(o.id)) {
        orderMap.set(o.id, o);
      }
    });

    return Array.from(orderMap.values());
  }, [availableOrders, allOrders, storeOrders, driverId, effectiveDriverLocation.lat, effectiveDriverLocation.lng]);

  const { isMyOrder, queueCount, atCapacity } = useDriverQueue(orders, driverId);

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);
  const activeOrders = useMemo(
    () =>
      orders
        .filter((o) => isMyOrder(o.id) && ACTIVE_STATUSES.includes(o.status))
        .sort((a, b) => Number(a.distanceMiles ?? 0) - Number(b.distanceMiles ?? 0)),
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
      } else if (order?.status && ACTIVE_STATUSES.includes(order.status)) {
        setCurrentTab('active');
      }
    }
  };

  const handleTabChange = (tab: 'active' | 'pending') => {
    setCurrentTab(tab);
    if (selectedId) {
      const order = orders.find((o) => o.id === selectedId);
      if (tab === 'active' && order && !ACTIVE_STATUSES.includes(order.status)) {
        setSelectedId(null);
      } else if (tab === 'pending' && order && order.status !== 'pending') {
        setSelectedId(null);
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
    if (atCapacity) {
      showToast('Active Queue Limit Reached', {
        type: 'warning',
        description: `You already have ${MAX_QUEUE} active deliveries. Complete an order to accept more.`,
      });
      return;
    }
    haptic('heavy');
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        status: 'accepted',
        driverUserId: driverId,
        driverName: user?.displayName ?? user?.email ?? 'Driver',
      });
      showToast('Order Accepted!', {
        type: 'success',
        description: `Order #${order.id.slice(-6).toUpperCase()} added to your route.`,
      });
      setSelectedOrder({ ...order, status: 'accepted', driverUserId: driverId });
      router.push(`/order/${order.id}`);
    } catch (err: any) {
      showToast(err?.message || 'Could not accept order', 'error');
    }
  };

  return {
    orders,
    activeOrders,
    pendingOrders,
    selectedOrder,
    selectedId,
    currentTab,
    effectiveDriverLocation,
    isConnected,
    atCapacity,
    queueCount,
    handleSelectId,
    handleTabChange,
    handleAcceptOrder,
    handleOpenOrder,
  };
}
