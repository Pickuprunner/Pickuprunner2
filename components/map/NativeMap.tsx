import React, { useRef, useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, StatusBar } from 'react-native';
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
  DARK_MAP_STYLE,
  haptic,
} from './mapTypes';
import { geocode, fetchDrivingRoute } from '@/lib/distance';

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
        {pending.length} pending deliveries available. Tap any order below to view route details or open in maps.
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
        Directions to Store Hub
      </Button>
    </YStack>
  );
}

export function NativeMap({
  orders,
  selectedId,
  onSelect,
}: {
  orders: Order[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
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

  // Pre-geocode any orders missing coordinates in the background
  useEffect(() => {
    let mounted = true;
    orders.forEach((o) => {
      if (o.pickupAddress && !getPickupCoords(o)) {
        geocode(o.pickupAddress).then(() => {
          if (mounted) setGeocodeTick((n) => n + 1);
        }).catch(() => {});
      }
      if (o.deliveryAddress && !getDeliveryCoords(o)) {
        geocode(o.deliveryAddress).then(() => {
          if (mounted) setGeocodeTick((n) => n + 1);
        }).catch(() => {});
      }
    });
    return () => {
      mounted = false;
    };
  }, [orders]);

  const active = orders.filter((o) => o.status === 'accepted' || o.status === 'picked_up');
  const pending = orders.filter((o) => o.status === 'pending');

  const pickupHubs = useMemo(() => {
    const hubMap = new Map<string, { lat: number; lng: number; address: string; orderIds: string[] }>();
    orders.forEach((o) => {
      const p = getPickupCoords(o);
      if (!p) return;
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
  }, [orders]);

  const initialCenter =
    getPickupCoords(active[0] || pending[0] || orders[0]) ||
    getDeliveryCoords(active[0] || pending[0] || orders[0]) ||
    CENTER;

  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const selected = orders.find((o) => o.id === selectedId);
    if (!selected) return;

    const p = getPickupCoords(selected);
    const d = getDeliveryCoords(selected);
    const coordsToFit: { latitude: number; longitude: number }[] = [];
    if (p) coordsToFit.push({ latitude: p.lat, longitude: p.lng });
    if (d) coordsToFit.push({ latitude: d.lat, longitude: d.lng });

    if (coordsToFit.length >= 2) {
      mapRef.current.fitToCoordinates(coordsToFit, {
        edgePadding: { top: 90, right: 60, bottom: 130, left: 60 },
        animated: true,
      });
    } else if (coordsToFit.length === 1) {
      mapRef.current.animateToRegion({
        latitude: coordsToFit[0].latitude,
        longitude: coordsToFit[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [selectedId, orders]);

  if (!MapView || !Marker) {
    return <NativeFallbackMap orders={orders} selectedId={selectedId} onSelect={onSelect} />;
  }

  const handleFitAllStops = () => {
    haptic('light');
    if (!mapRef.current) return;
    const allCoords: { latitude: number; longitude: number }[] = [];
    orders.forEach((o) => {
      const p = getPickupCoords(o);
      const d = getDeliveryCoords(o);
      if (p) allCoords.push({ latitude: p.lat, longitude: p.lng });
      if (d) allCoords.push({ latitude: d.lat, longitude: d.lng });
    });

    if (allCoords.length > 0) {
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 70, right: 40, bottom: 130, left: 40 },
        animated: true,
      });
    } else {
      mapRef.current.animateToRegion({
        latitude: initialCenter.lat,
        longitude: initialCenter.lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
    }
  };

  const handleRecenterStore = () => {
    haptic('light');
    if (!mapRef.current) return;
    const target = pickupHubs[0] || initialCenter;
    mapRef.current.animateToRegion({
      latitude: target.lat,
      longitude: target.lng,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    });
  };

  const handleRecenterDriver = async () => {
    haptic('light');
    if (!mapRef.current) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (pos?.coords) {
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
      latitudeDelta: Math.min(80, cur.latitudeDelta * 2),
      longitudeDelta: Math.min(80, cur.longitudeDelta * 2),
    };
    regionRef.current = next;
    mapRef.current.animateToRegion(next, 200);
  };

  const activeOrder = active[0];
  const targetRouteOrder = (selectedId ? orders.find((o) => o.id === selectedId) : null) || activeOrder;
  const routePickup = targetRouteOrder ? getPickupCoords(targetRouteOrder) : null;
  const routeDelivery = targetRouteOrder ? getDeliveryCoords(targetRouteOrder) : null;

  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!routePickup || !routeDelivery) {
      setRouteCoordinates([]);
      return;
    }

    setRouteCoordinates([
      { latitude: routePickup.lat, longitude: routePickup.lng },
      { latitude: routeDelivery.lat, longitude: routeDelivery.lng },
    ]);

    fetchDrivingRoute(routePickup, routeDelivery)
      .then((coords) => {
        if (!cancelled && coords.length >= 2) {
          setRouteCoordinates(coords);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [routePickup?.lat, routePickup?.lng, routeDelivery?.lat, routeDelivery?.lng]);

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
          }
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
      
        {Polyline && routeCoordinates.length >= 2 && (
          <>
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="rgba(0, 0, 0, 0.65)"
              strokeWidth={Platform.OS === 'ios' ? 6 : 7}
            />
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={targetRouteOrder?.status === 'accepted' || targetRouteOrder?.status === 'picked_up' ? colors.tertiary : COBALT}
              strokeWidth={Platform.OS === 'ios' ? 3.5 : 4}
            />
          </>
        )}

        {pickupHubs.map((hub, idx) => {
          const isSelected = Boolean(selectedId && hub.orderIds.includes(selectedId));
          return (
            <Marker
              key={`hub-${hub.lat}-${hub.lng}-${idx}`}
              coordinate={{ latitude: hub.lat, longitude: hub.lng }}
              title="Pickup Store"
              description={hub.address}
              onPress={() => {
                if (hub.orderIds.length > 0) {
                  onSelect(hub.orderIds[0]);
                }
              }}
            >
              <View style={[styles.pickupHubPinContainer, isSelected && styles.pickupHubPinSelected]}>
                <MaterialIcons name="storefront" size={16} color={colors.primary} />
                {hub.orderIds.length > 1 && (
                  <View style={styles.hubBadge}>
                    <Text style={styles.hubBadgeText}>{hub.orderIds.length}</Text>
                  </View>
                )}
              </View>
              {Callout ? (
                <Callout tooltip onPress={() => onSelect(hub.orderIds[0])} style={{ width: 200, alignItems: 'center' }}>
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      Pickup: Store {hub.orderIds.length > 1 ? `(${hub.orderIds.length} orders)` : ''}
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

        {orders.map((order) => {
          const dCoords = getDeliveryCoords(order);
          if (!dCoords) return null;
          const isSelected = Boolean(selectedId && order.id === selectedId);
          const isActive = order.status === 'accepted' || order.status === 'picked_up';
          return (
            <Marker
              key={`delivery-${order.id}`}
              coordinate={{ latitude: dCoords.lat, longitude: dCoords.lng }}
              title={order.customerName || 'Customer Destination'}
              description={order.deliveryAddress}
              onPress={() => onSelect(order.id)}
            >
              <View
                style={[
                  styles.deliveryPinContainer,
                  isActive && styles.deliveryPinActive,
                  isSelected && (isActive ? styles.deliveryPinSelectedActive : styles.deliveryPinSelectedPending),
                ]}
              >
                <MaterialIcons
                  name="location-on"
                  size={15}
                  color={isActive ? colors.tertiary : GOLD}
                />
              </View>
              {Callout ? (
                <Callout tooltip onPress={() => onSelect(order.id)} style={{ width: 200, alignItems: 'center' }}>
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      {order.customerName || (isActive ? 'Active Order' : 'Delivery')}
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
          <MaterialIcons name="my-location" size={20} color={colors.tertiary} />
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
          accessibilityLabel="Recenter Store Hub"
        >
          <MaterialIcons name="storefront" size={18} color={colors.primary} />
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
  deliveryPinContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  deliveryPinActive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.tertiary,
    borderWidth: 2.5,
    shadowColor: colors.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  deliveryPinSelectedPending: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 8,
  },
  deliveryPinSelectedActive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.tertiary,
    shadowColor: colors.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
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
