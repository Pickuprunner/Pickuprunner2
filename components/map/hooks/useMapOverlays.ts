import { useMemo, useState, useEffect } from 'react';
import { Order } from '@/lib/orders';
import { APP_CONFIG } from '@/lib/config';
import { ACTIVE_STATUSES } from '@/lib/driverQueue';
import { getPickupCoords, getDeliveryCoords } from '../mapTypes';
import { fetchDrivingRoute } from '@/lib/distance';
import { getApproachArcCoordinates } from '../mapApproachUtils';

export interface PickupHub {
  lat: number;
  lng: number;
  address: string;
  orderIds: string[];
}

export interface UseMapOverlaysParams {
  orders: Order[];
  currentTab?: 'active' | 'pending';
  selectedId: string | null;
  activeOrders?: Order[];
}

function isValidCoord(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    !isNaN(lat) &&
    isFinite(lat) &&
    typeof lng === 'number' &&
    !isNaN(lng) &&
    isFinite(lng) &&
    lat !== 0 &&
    lng !== 0
  );
}

export function useMapOverlays({
  orders,
  currentTab = 'pending',
  selectedId,
  activeOrders: passedActiveOrders,
}: UseMapOverlaysParams) {
  const active = useMemo(
    () => passedActiveOrders || orders.filter((o) => ACTIVE_STATUSES.includes(o.status)),
    [passedActiveOrders, orders]
  );

  const pending = useMemo(
    () => orders.filter((o) => o.status === 'pending'),
    [orders]
  );


  const currentTabOrders = useMemo(() => {
    return currentTab === 'active' ? active : pending;
  }, [currentTab, active, pending]);

  const visibleOrders = currentTabOrders;

  const validDeliveryOrders = useMemo(
    () =>
      visibleOrders.filter((o) => {
        const d = getDeliveryCoords(o);
        return d != null && isValidCoord(d.lat, d.lng);
      }),
    [visibleOrders]
  );

  
  const targetRouteOrder = useMemo(() => {
    if (selectedId) {
      const found = visibleOrders.find((o) => o.id === selectedId);
      if (found) return found;
    }
    return visibleOrders[0] || null;
  }, [selectedId, visibleOrders]);

  const routePickup = useMemo(() => {
    if (!targetRouteOrder) return null;
    const p = getPickupCoords(targetRouteOrder);
    return p && isValidCoord(p.lat, p.lng) ? p : null;
  }, [targetRouteOrder]);

  const routeDelivery = useMemo(() => {
    if (!targetRouteOrder) return null;
    const d = getDeliveryCoords(targetRouteOrder);
    return d && isValidCoord(d.lat, d.lng) ? d : null;
  }, [targetRouteOrder]);

  const hasActiveRoute = Boolean(targetRouteOrder && routePickup && routeDelivery);


  const pickupHubs = useMemo(() => {
    const hubMap = new Map<string, PickupHub>();
    visibleOrders.forEach((o) => {
      const p = getPickupCoords(o);
      if (!p || !isValidCoord(p.lat, p.lng)) return;
      const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
      const existing = hubMap.get(key);
      if (existing) {
        existing.orderIds.push(o.id);
      } else {
        hubMap.set(key, {
          lat: p.lat,
          lng: p.lng,
          address: o.pickupAddress || APP_CONFIG.STORE_ADDRESS,
          orderIds: [o.id],
        });
      }
    });
    return Array.from(hubMap.values());
  }, [visibleOrders]);

  const pinCollisionOffsets = useMemo(() => {
    const coordsList: { id: string; lat: number; lng: number }[] = [];
    pickupHubs.forEach((h) => {
      coordsList.push({ id: `hub-${h.lat.toFixed(4)}-${h.lng.toFixed(4)}`, lat: h.lat, lng: h.lng });
    });
    validDeliveryOrders.forEach((o) => {
      const d = getDeliveryCoords(o);
      if (d && isValidCoord(d.lat, d.lng)) coordsList.push({ id: `delivery-${o.id}`, lat: d.lat, lng: d.lng });
    });

    const offsetMap = new Map<string, { lat: number; lng: number }>();
    coordsList.forEach((item) => {
      const collisions = coordsList.filter(
        (other) =>
          Math.abs(other.lat - item.lat) < 0.00025 &&
          Math.abs(other.lng - item.lng) < 0.00025
      );
      if (collisions.length > 1) {
        const idx = collisions.findIndex((c) => c.id === item.id);
        const angle = (2 * Math.PI * idx) / collisions.length;
        const offsetDist = 0.00018; // ~18-20m
        offsetMap.set(item.id, {
          lat: item.lat + offsetDist * Math.cos(angle),
          lng: item.lng + offsetDist * Math.sin(angle),
        });
      }
    });
    return offsetMap;
  }, [pickupHubs, validDeliveryOrders]);

  
  const [routeState, setRouteState] = useState<{
    orderId: string | null;
    coords: { latitude: number; longitude: number }[];
  }>({ orderId: null, coords: [] });

  useEffect(() => {
    let cancelled = false;
    const currentOrderId = targetRouteOrder?.id || null;

    if (!currentOrderId || !routePickup || !routeDelivery) {
      setRouteState({ orderId: null, coords: [] });
      return;
    }

    fetchDrivingRoute(routePickup, routeDelivery)
      .then((coords) => {
        if (cancelled) return;
        const middlePts = (coords && coords.length >= 2 ? coords : []).filter((c) =>
          isValidCoord(c.latitude, c.longitude)
        );

       
        const isMultiNodeRoute = middlePts.length > 2;
        const roadPoints = isMultiNodeRoute
          ? [{ latitude: routePickup.lat, longitude: routePickup.lng }, ...middlePts]
          : [{ latitude: routePickup.lat, longitude: routePickup.lng }, ...middlePts, { latitude: routeDelivery.lat, longitude: routeDelivery.lng }];

        const nodeToNode = roadPoints.filter((c, idx, arr) => {
          if (idx === 0) return true;
          return (
            Math.abs(c.latitude - arr[idx - 1].latitude) > 0.00001 ||
            Math.abs(c.longitude - arr[idx - 1].longitude) > 0.00001
          );
        });

        setRouteState({
          orderId: currentOrderId,
          coords: nodeToNode.length >= 2 ? nodeToNode : [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = [
          { latitude: routePickup.lat, longitude: routePickup.lng },
          { latitude: routeDelivery.lat, longitude: routeDelivery.lng },
        ].filter((c) => isValidCoord(c.latitude, c.longitude));
        setRouteState({
          orderId: currentOrderId,
          coords: fallback.length >= 2 ? fallback : [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [targetRouteOrder?.id, routePickup?.lat, routePickup?.lng, routeDelivery?.lat, routeDelivery?.lng]);

  const routeCoordinates = useMemo(() => {
    return routeState.orderId === targetRouteOrder?.id ? routeState.coords : [];
  }, [routeState, targetRouteOrder?.id]);

  const curbPoint = routeCoordinates.length >= 2 ? routeCoordinates[routeCoordinates.length - 1] : null;
  const approachCoordinates = useMemo(() => {
    if (
      !curbPoint ||
      !routeDelivery ||
      !isValidCoord(curbPoint.latitude, curbPoint.longitude) ||
      !isValidCoord(routeDelivery.lat, routeDelivery.lng)
    ) {
      return [];
    }

    const dLat = Math.abs(curbPoint.latitude - routeDelivery.lat);
    const dLng = Math.abs(curbPoint.longitude - routeDelivery.lng);
    if (dLat < 0.00005 && dLng < 0.00005) {
      return [];
    }

    return [
      curbPoint,
      { latitude: routeDelivery.lat, longitude: routeDelivery.lng },
    ];
  }, [curbPoint, routeDelivery]);


  const targetCoordinatesToFit = useMemo(() => {
    if (!targetRouteOrder) return [];
    const p = getPickupCoords(targetRouteOrder);
    const d = getDeliveryCoords(targetRouteOrder);
    const list: { latitude: number; longitude: number }[] = [];
    if (p) list.push({ latitude: p.lat, longitude: p.lng });
    if (d) list.push({ latitude: d.lat, longitude: d.lng });
    return list;
  }, [targetRouteOrder]);

  return {
    active,
    pending,
    visibleOrders,
    validDeliveryOrders,
    targetRouteOrder,
    routePickup,
    routeDelivery,
    hasActiveRoute,
    pickupHubs,
    pinCollisionOffsets,
    routeCoordinates,
    approachCoordinates,
    targetCoordinatesToFit,
  };
}
