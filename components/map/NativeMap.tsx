import React, { useRef, useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, StatusBar, Dimensions } from 'react-native';
import { YStack, SizableText, Button, MapPin, Navigation } from '@blinkdotnew/mobile-ui';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Order } from '@/lib/orders';
import { APP_CONFIG } from '@/lib/config';
import { colors, shadows } from '@/constants/design';
import {
  CENTER,
  getCoords,
  getPickupCoords,
  getDeliveryCoords,
  openMapsNavigation,
  GOLD,
  COBALT,
  ROUTE_ACTIVE,
  ROUTE_PENDING,
  DARK_MAP_STYLE,
  haptic,
} from './mapTypes';
import { ACTIVE_STATUSES } from '@/lib/driverQueue';
import { geocode } from '@/lib/distance';
import { useLocationStore } from '@/store/useLocationStore';
import { isStreetZoomLevel } from './mapApproachUtils';
import { DestinationPin } from './DestinationPin';
import { useMapOverlays } from './hooks/useMapOverlays';

function NativeFallbackMap({
  orders,
}: {
  orders: Order[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const pending = orders.filter((o) => o.status === 'pending');
  return (
    <YStack flex={1} padding="$4" gap="$3" justifyContent="center" alignItems="center" backgroundColor={colors.background}>
      <YStack
        width={60}
        height={60}
        borderRadius={30}
        backgroundColor={colors.accentAlpha15}
        borderWidth={1.5}
        borderColor={colors.accentAlpha40}
        alignItems="center"
        justifyContent="center"
      >
        <MapPin size={30} color={GOLD} />
      </YStack>
      <SizableText size="$5" fontWeight="800" textAlign="center" color={colors.onSurface}>
        Delivery Routes
      </SizableText>
      <SizableText size="$2" color={colors.textSecondary} textAlign="center" paddingHorizontal="$4">
        {pending.length} orders available. Tap any order below to view route details or open in maps.
      </SizableText>
      <Button
        size="$3"
        backgroundColor={colors.accentAlpha15}
        borderColor={colors.accentAlpha40}
        borderWidth={1}
        color={GOLD}
        borderRadius="$full"
        icon={<Navigation size={14} color={GOLD} />}
        onPress={() => openMapsNavigation(APP_CONFIG.STORE_ADDRESS)}
      >
        Directions to Pickup Point
      </Button>
    </YStack>
  );
}

export function NativeMap({
  orders,
  selectedId,
  onSelect,
  currentTab = 'pending',
  driverLocation,
  activeOrders: passedActiveOrders,
}: {
  orders: Order[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  currentTab?: 'active' | 'pending';
  driverLocation?: { lat?: number; lng?: number };
  activeOrders?: Order[];
}) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const { width: winWidth, height: winHeight } = Dimensions.get('window');
  const dynamicEdgePadding = useMemo(() => ({
    top: Math.max(25, Math.min(50, Math.round(winHeight * 0.06))),
    bottom: Math.max(35, Math.min(65, Math.round(winHeight * 0.08))),
    left: Math.max(20, Math.min(40, Math.round(winWidth * 0.08))),
    right: Math.max(20, Math.min(40, Math.round(winWidth * 0.08))),
  }), [winWidth, winHeight]);
  const regionRef = useRef<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [, setGeocodeTick] = useState(0);

  let MapView: any = null;
  let Marker: any = null;
  let Callout: any = null;
  let Polyline: any = null;

  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    Callout = Maps.Callout;
    Polyline = Maps.Polyline;
  } catch (err) {
    console.warn('[map] react-native-maps not available, using fallback view');
  }

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

  const hasCenteredDriverRef = useRef(false);
  const attemptedAddressesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    orders.forEach((o) => {
      if (o.pickupAddress && !getPickupCoords(o) && !attemptedAddressesRef.current.has(o.pickupAddress)) {
        attemptedAddressesRef.current.add(o.pickupAddress);
        geocode(o.pickupAddress).then(() => {
          if (mounted) setGeocodeTick((n) => n + 1);
        }).catch(() => {});
      }
      if (o.deliveryAddress && !getDeliveryCoords(o) && !attemptedAddressesRef.current.has(o.deliveryAddress)) {
        attemptedAddressesRef.current.add(o.deliveryAddress);
        geocode(o.deliveryAddress).then(() => {
          if (mounted) setGeocodeTick((n) => n + 1);
        }).catch(() => {});
      }
    });
    return () => {
      mounted = false;
    };
  }, [orders]);

  const {
    active,
    pending,
    visibleOrders,
    validDeliveryOrders,
    targetRouteOrder,
    hasActiveRoute,
    pickupHubs,
    pinCollisionOffsets,
    routeCoordinates,
    approachCoordinates,
    targetCoordinatesToFit,
  } = useMapOverlays({
    orders,
    currentTab,
    selectedId,
    activeOrders: passedActiveOrders,
  });

  const hubColor = currentTab === 'pending' ? GOLD : COBALT;

  const initialCenter =
    driverCoords ||
    (currentTab === 'active' && active[0] && (getPickupCoords(active[0]) || getDeliveryCoords(active[0]))) ||
    (currentTab === 'pending' && pending[0] && (getPickupCoords(pending[0]) || getDeliveryCoords(pending[0]))) ||
    getPickupCoords(active[0] || pending[0] || orders[0]) ||
    getDeliveryCoords(active[0] || pending[0] || orders[0]) ||
    CENTER;

  
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
        console.warn('[NativeMap] Driver default location error:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const cameraTimeoutRef = useRef<any>(null);

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

    const latDelta = Math.max(0.025, (maxLat - minLat) * 1.7);
    const lngDelta = Math.max(0.025, (maxLng - minLng) * 1.7);
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

  useEffect(() => {
    return () => {
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }
    };
  }, []);

  const lastTargetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
      cameraTimeoutRef.current = null;
    }

    if (!mapRef.current || targetCoordinatesToFit.length === 0) {
      lastTargetKeyRef.current = null;
      return;
    }

    const targetKey = `${currentTab}-${selectedId || 'none'}-${targetRouteOrder?.id || 'none'}`;
    if (lastTargetKeyRef.current === targetKey) {
      return;
    }
    lastTargetKeyRef.current = targetKey;

    cameraTimeoutRef.current = setTimeout(() => {
      safeAnimateToCoords(targetCoordinatesToFit, Boolean(selectedId));
    }, 120);
  }, [selectedId, currentTab, targetCoordinatesToFit, targetRouteOrder?.id]);

  if (!MapView || !Marker) {
    return <NativeFallbackMap orders={orders} selectedId={selectedId} onSelect={onSelect} />;
  }

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
      console.warn('[NativeMap] Failed to get driver location:', err);
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

  const [isZoomedIn, setIsZoomedIn] = useState(false);

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark"
        initialRegion={{
          latitude: initialCenter.lat,
          longitude: initialCenter.lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        onRegionChangeComplete={(region: any) => {
          if (region && region.latitudeDelta > 0 && region.longitudeDelta > 0) {
            regionRef.current = region;
            const zoomed = isStreetZoomLevel(region.latitudeDelta);
            setIsZoomedIn((prev) => (prev !== zoomed ? zoomed : prev));
          }
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
      
        {Boolean(Polyline && hasActiveRoute && targetRouteOrder && routeCoordinates.length >= 2) && (
          <Polyline
            key={`${currentTab}-route-base-${targetRouteOrder?.id}`}
            coordinates={routeCoordinates}
            strokeColor="rgba(0, 0, 0, 0.7)"
            strokeWidth={Platform.OS === 'ios' ? 6 : 7}
          />
        )}
        {Boolean(Polyline && hasActiveRoute && targetRouteOrder && routeCoordinates.length >= 2) && (
          <Polyline
            key={`${currentTab}-route-color-${targetRouteOrder?.id}`}
            coordinates={routeCoordinates}
            strokeColor={
              targetRouteOrder?.status && ACTIVE_STATUSES.includes(targetRouteOrder.status)
                ? ROUTE_ACTIVE
                : ROUTE_PENDING
            }
            strokeWidth={Platform.OS === 'ios' ? 3.8 : 4.2}
          />
        )}

        {Boolean(Polyline && hasActiveRoute && targetRouteOrder && approachCoordinates.length >= 2) && (
          <Polyline
            key={`${currentTab}-route-approach-${targetRouteOrder?.id}`}
            coordinates={approachCoordinates}
            strokeColor={
              targetRouteOrder?.status && ACTIVE_STATUSES.includes(targetRouteOrder.status)
                ? 'rgba(179, 197, 255, 0.95)'
                : 'rgba(255, 227, 153, 0.95)'
            }
            strokeWidth={Platform.OS === 'ios' ? 2.5 : 3}
            lineDashPattern={[5, 5]}
            lineCap="round"
          />
        )}

        {pickupHubs.map((hub) => {
          const isSelected = Boolean(selectedId && hub.orderIds.includes(selectedId));
          const hubKey = `hub-${hub.lat.toFixed(4)}-${hub.lng.toFixed(4)}`;
          const offset = pinCollisionOffsets.get(hubKey);
          const coord = offset || { latitude: hub.lat, longitude: hub.lng };
          return (
            <Marker
              key={`${currentTab}-${hubKey}`}
              coordinate={coord}
              zIndex={isSelected ? 150 : 50}
              onPress={() => {
                if (hub.orderIds.length > 0) {
                  onSelect(hub.orderIds[0]);
                }
              }}
            >
              <View
                style={[
                  styles.pickupHubPinContainer,
                  { borderColor: hubColor },
                  isSelected && { transform: [{ scale: 1.15 }] },
                ]}
              >
                <MaterialIcons name="storefront" size={16} color={hubColor} />
                {hub.orderIds.length > 1 && (
                  <View style={[styles.hubBadge, { backgroundColor: hubColor }]}>
                    <Text style={styles.hubBadgeText}>{hub.orderIds.length}</Text>
                  </View>
                )}
              </View>
              {Callout ? (
                <Callout tooltip onPress={() => onSelect(hub.orderIds[0])} style={{ width: 200, alignItems: 'center' }}>
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      Pickup Point {hub.orderIds.length > 1 ? `(${hub.orderIds.length} orders)` : ''}
                    </Text>
                    <Text style={styles.calloutSub} numberOfLines={2}>
                      {hub.address}
                    </Text>
                  </View>
                  <View style={styles.calloutArrow} />
                </Callout>
              ) : null}
            </Marker>
          );
        })}

        {validDeliveryOrders.map((order) => {
          const dCoords = getDeliveryCoords(order)!;
          const isSelected = Boolean(selectedId && order.id === selectedId);
          const activeIndex = active.findIndex((a) => a.id === order.id);
          const isActive = activeIndex >= 0;
          const stopNumber = isActive ? activeIndex + 1 : null;
          const offset = pinCollisionOffsets.get(`delivery-${order.id}`);
          const coord = offset || { latitude: dCoords.lat, longitude: dCoords.lng };
          const markerZIndex = isSelected ? 200 : (isActive ? 100 - activeIndex : 10);

          return (
            <Marker
              key={`${currentTab}-delivery-${order.id}`}
              coordinate={coord}
              zIndex={markerZIndex}
              onPress={() => onSelect(order.id)}
            >
              <DestinationPin
                order={order}
                isActive={isActive}
                stopNumber={stopNumber}
                isSelected={isSelected}
                isZoomedIn={isZoomedIn}
                isTargetRoute={targetRouteOrder?.id === order.id}
              />
              {Callout ? (
                <Callout tooltip onPress={() => onSelect(order.id)} style={{ width: 200, alignItems: 'center' }}>
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      {isActive ? `Stop #${stopNumber}: Drop Point` : 'Drop Point'}
                    </Text>
                    <Text style={styles.calloutSub} numberOfLines={2}>
                      {order.deliveryAddress}
                    </Text>
                  </View>
                  <View style={styles.calloutArrow} />
                </Callout>
              ) : null}
            </Marker>
          );
        })}
      </MapView>

      {/* Floating Map Controls */}
      <View style={[styles.floatingControls, { top: insets.top ? insets.top + 10 : 52 }]}>
        <Pressable
          style={({ pressed }) => [styles.mapFab, pressed && { opacity: 0.8 }]}
          onPress={handleRecenterDriver}
          accessibilityLabel="Recenter on Driver Location"
        >
          <MaterialIcons name="my-location" size={20} color={COBALT} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.mapFab, pressed && { opacity: 0.8 }]}
          onPress={handleFitAllStops}
          accessibilityLabel="Fit All Stops"
        >
          <MaterialIcons name="center-focus-strong" size={20} color={colors.onSurface} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.mapFab, pressed && { opacity: 0.8 }]}
          onPress={handleRecenterStore}
          accessibilityLabel="Recenter Pickup Point"
        >
          <MaterialIcons name="storefront" size={18} color={hubColor} />
        </Pressable>
      </View>

      
      <View style={styles.zoomControls}>
        <Pressable
          style={({ pressed }) => [styles.zoomBtn, styles.zoomBtnTop, pressed && { opacity: 0.7 }]}
          onPress={handleZoomIn}
          accessibilityLabel="Zoom In"
        >
          <MaterialIcons name="add" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          style={({ pressed }) => [styles.zoomBtn, styles.zoomBtnBottom, pressed && { opacity: 0.7 }]}
          onPress={handleZoomOut}
          accessibilityLabel="Zoom Out"
        >
          <MaterialIcons name="remove" size={22} color={colors.onSurface} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  floatingControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ? StatusBar.currentHeight + 14 : 52),
    right: 16,
    gap: 10,
    zIndex: 10,
  },
  mapFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 19, 28, 0.85)',
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  zoomControls: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 19, 28, 0.90)',
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    overflow: 'hidden',
    zIndex: 10,
    ...shadows.md,
  },
  zoomBtn: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnTop: {
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  zoomBtnBottom: {
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: colors.glassLevel2Border,
    width: '100%',
  },
  pickupHubPinContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.cobaltGlow,
  },
  hubBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#0F131C',
  },
  hubBadgeText: {
    color: '#0F131C',
    fontSize: 9,
    fontWeight: '800',
  },
  pickupHubPinSelected: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowRadius: 10,
    shadowOpacity: 0.8,
  },
  calloutCard: {
    width: 200,
    padding: 10,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    ...shadows.md,
  },
  calloutTitle: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.onSurface,
    marginBottom: 2,
  },
  calloutSub: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  calloutArrow: {
    width: 10,
    height: 10,
    backgroundColor: colors.surfaceContainer,
    marginTop: -5,
    transform: [{ rotate: '45deg' }],
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.glassLevel2Border,
  },
});
