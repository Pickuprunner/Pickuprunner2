import { useRef, useEffect, useState, useMemo } from 'react';
import * as Location from 'expo-location';
import { Order } from '@/lib/orders';
import { useLocationStore } from '@/store/useLocationStore';
import { CENTER, getPickupCoords, getDeliveryCoords, haptic, COBALT } from '../mapTypes';
import { isStreetZoomLevel } from '../mapApproachUtils';
import { PickupHub } from './useMapOverlays';

export interface UseMapCameraParams {
  orders: Order[];
  currentTab: 'active' | 'pending';
  selectedId: string | null;
  driverLocation?: { lat?: number; lng?: number };
  visibleOrders: Order[];
  active: Order[];
  pending: Order[];
  pickupHubs: PickupHub[];
  targetRouteOrder: Order | null;
  targetCoordinatesToFit: { latitude: number; longitude: number }[];
  dynamicEdgePadding: { top: number; bottom: number; left: number; right: number };
}

export function useMapCamera({
  orders,
  currentTab,
  selectedId,
  driverLocation,
  visibleOrders,
  active,
  pending,
  pickupHubs,
  targetRouteOrder,
  targetCoordinatesToFit,
  dynamicEdgePadding,
}: UseMapCameraParams) {
  const mapRef = useRef<any>(null);
  const regionRef = useRef<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const hasCenteredDriverRef = useRef(false);

  const storedLocation = useLocationStore((state) => state.currentLocation);
  const driverCoords = useMemo(() => {
    if (driverLocation?.lat != null && driverLocation?.lng != null) {
      return { lat: driverLocation.lat, lng: driverLocation.lng };
    }
    if (storedLocation?.lat != null && storedLocation?.lon != null) {
      return { lat: storedLocation.lat, lng: storedLocation.lon };
    }
    return null;
  }, [driverLocation?.lat, driverLocation?.lng, storedLocation?.lat, storedLocation?.lon]);

  const initialCenter = useMemo(() => {
    return (
      driverCoords ||
      (currentTab === 'active' && active[0] && (getPickupCoords(active[0]) || getDeliveryCoords(active[0]))) ||
      (currentTab === 'pending' && pending[0] && (getPickupCoords(pending[0]) || getDeliveryCoords(pending[0]))) ||
      getPickupCoords(active[0] || pending[0] || orders[0]) ||
      getDeliveryCoords(active[0] || pending[0] || orders[0]) ||
      CENTER
    );
  }, [driverCoords, currentTab, active, pending, orders]);

  // Initial driver centering
  useEffect(() => {
    if (hasCenteredDriverRef.current || selectedId) return;
    if (driverCoords && mapRef.current) {
      hasCenteredDriverRef.current = true;
      mapRef.current.animateToRegion({
        latitude: driverCoords.lat,
        longitude: driverCoords.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
    }
  }, [driverCoords, selectedId]);

  // Driver GPS watcher & default location fetcher
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted' && mounted) {
          const last = await Location.getLastKnownPositionAsync().catch(() => null);
          if (mounted && last?.coords) {
            useLocationStore.getState().setCurrentLocation({
              lat: last.coords.latitude,
              lon: last.coords.longitude,
            });
            if (mapRef.current && !hasCenteredDriverRef.current) {
              hasCenteredDriverRef.current = true;
              mapRef.current.animateToRegion({
                latitude: last.coords.latitude,
                longitude: last.coords.longitude,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              });
            }
          }
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
          if (mounted && pos?.coords) {
            useLocationStore.getState().setCurrentLocation({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            });
            if (mapRef.current && !hasCenteredDriverRef.current) {
              hasCenteredDriverRef.current = true;
              mapRef.current.animateToRegion({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[useMapCamera] Driver default location error:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const safeAnimateToCoords = (coords: { latitude: number; longitude: number }[], offsetBottom = false) => {
    if (!mapRef.current || coords.length === 0) return;
    const validCoords = coords.filter((c) => Number.isFinite(c?.latitude) && Number.isFinite(c?.longitude));
    if (validCoords.length === 0) return;

    if (validCoords.length === 1) {
      try {
        mapRef.current.animateToRegion({
          latitude: validCoords[0].latitude,
          longitude: validCoords[0].longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }, 350);
      } catch {}
      return;
    }

    const lats = validCoords.map((c) => c.latitude);
    const lngs = validCoords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDelta = Math.max(0.035, (maxLat - minLat) * 2.3);
    const lngDelta = Math.max(0.035, (maxLng - minLng) * 2.3);
    const centerLat = (minLat + maxLat) / 2 - (offsetBottom ? latDelta * 0.18 : 0);
    const centerLng = (minLng + maxLng) / 2;

    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng) || !Number.isFinite(latDelta) || !Number.isFinite(lngDelta)) {
      return;
    }

    try {
      mapRef.current.animateToRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      }, 350);
    } catch {}
  };

  const prevTabRef = useRef(currentTab);
  const pendingTabFitRef = useRef(false);

  useEffect(() => {
   
    if (prevTabRef.current !== currentTab) {
      prevTabRef.current = currentTab;
      pendingTabFitRef.current = true;
    }

    if (pendingTabFitRef.current && mapRef.current && targetCoordinatesToFit.length > 0) {
      pendingTabFitRef.current = false;
      safeAnimateToCoords(targetCoordinatesToFit, false);
    }
  }, [currentTab, targetCoordinatesToFit]);

  const handleRecenterDriver = async () => {
    haptic('light');
    if (!mapRef.current) return;
    try {
      if (driverCoords) {
        mapRef.current.animateToRegion({
          latitude: driverCoords.lat,
          longitude: driverCoords.lng,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        });
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (pos?.coords) {
          useLocationStore.getState().setCurrentLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          mapRef.current.animateToRegion({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          });
        }
      }
    } catch (err) {
      console.warn('[useMapCamera] Failed to get driver location:', err);
    }
  };

  const handleFitAllStops = () => {
    haptic('light');
    if (!mapRef.current) return;
    const allCoords: { latitude: number; longitude: number }[] = [];

    visibleOrders.forEach((o) => {
      const p = getPickupCoords(o);
      const d = getDeliveryCoords(o);
      if (p) allCoords.push({ latitude: p.lat, longitude: p.lng });
      if (d) allCoords.push({ latitude: d.lat, longitude: d.lng });
    });

    if (allCoords.length >= 2) {
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: dynamicEdgePadding,
        animated: true,
      });
    } else if (allCoords.length === 1) {
      mapRef.current.animateToRegion({
        latitude: allCoords[0].latitude,
        longitude: allCoords[0].longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
    } else {
      handleRecenterDriver();
    }
  };

  const handleRecenterStore = () => {
    haptic('light');
    if (!mapRef.current) return;

    const selected = selectedId ? visibleOrders.find((o) => o.id === selectedId) : null;
    const targetOrder = selected || visibleOrders[0];
    const targetCoords = targetOrder ? getPickupCoords(targetOrder) : null;
    const target = targetCoords || pickupHubs[0];

    if (target) {
      mapRef.current.animateToRegion({
        latitude: target.lat,
        longitude: target.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
    } else {
      handleRecenterDriver();
    }
  };

  const handleZoomIn = () => {
    haptic('light');
    if (!mapRef.current) return;
    const cur = regionRef.current || {
      latitude: initialCenter.lat,
      longitude: initialCenter.lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
    const next = {
      ...cur,
      latitudeDelta: Math.max(0.001, cur.latitudeDelta * 0.5),
      longitudeDelta: Math.max(0.001, cur.longitudeDelta * 0.5),
    };
    regionRef.current = next;
    mapRef.current.animateToRegion(next, 200);
  };

  const handleZoomOut = () => {
    haptic('light');
    if (!mapRef.current) return;
    const cur = regionRef.current || {
      latitude: initialCenter.lat,
      longitude: initialCenter.lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
    const next = {
      ...cur,
      latitudeDelta: Math.min(2.0, cur.latitudeDelta * 2.0),
      longitudeDelta: Math.min(2.0, cur.longitudeDelta * 2.0),
    };
    regionRef.current = next;
    mapRef.current.animateToRegion(next, 200);
  };

  const onRegionChangeComplete = (region: any) => {
    if (region && region.latitudeDelta > 0 && region.longitudeDelta > 0) {
      regionRef.current = region;
      const zoomed = isStreetZoomLevel(region.latitudeDelta);
      setIsZoomedIn((prev) => (prev !== zoomed ? zoomed : prev));
    }
  };

  return {
    mapRef,
    initialCenter,
    driverCoords,
    isZoomedIn,
    handleRecenterDriver,
    handleFitAllStops,
    handleRecenterStore,
    handleZoomIn,
    handleZoomOut,
    onRegionChangeComplete,
  };
}
