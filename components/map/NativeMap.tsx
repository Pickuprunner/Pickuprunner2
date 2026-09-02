import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, StatusBar } from 'react-native';
import { YStack, SizableText, Button, MapPin, Navigation } from '@blinkdotnew/mobile-ui';
import { MaterialIcons } from '@expo/vector-icons';
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
import { geocode } from '@/lib/distance';

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
  const mapRef = useRef<any>(null);
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

  const focusedOrder = orders.find((o) => o.id === selectedId) || active[0] || pending[0] || orders[0] || null;
  const focusedPickup = getPickupCoords(focusedOrder);
  const focusedDelivery = getDeliveryCoords(focusedOrder);

  const initialCenter = focusedPickup || focusedDelivery || getPickupCoords(orders[0]) || getDeliveryCoords(orders[0]) || CENTER;

  // Auto-fit or zoom to focused order coordinates on selection or load
  useEffect(() => {
    if (!mapRef.current) return;
    const coordsToFit: { latitude: number; longitude: number }[] = [];
    if (focusedPickup) coordsToFit.push({ latitude: focusedPickup.lat, longitude: focusedPickup.lng });
    if (focusedDelivery) coordsToFit.push({ latitude: focusedDelivery.lat, longitude: focusedDelivery.lng });

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
  }, [selectedId, focusedOrder?.id, focusedPickup?.lat, focusedDelivery?.lat]);

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
    const target = focusedPickup || initialCenter;
    mapRef.current.animateToRegion({
      latitude: target.lat,
      longitude: target.lng,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    });
  };

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
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >

        {/* Pickup Pins (Matches Store / 'Pick up from' location) */}
        {orders.map((order) => {
          const pCoords = getPickupCoords(order);
          if (!pCoords) return null;
          const isSelected = order.id === selectedId || order.id === focusedOrder?.id;
          return (
            <Marker
              key={`pickup-${order.id}`}
              coordinate={{ latitude: pCoords.lat, longitude: pCoords.lng }}
              title="Pickup Store"
              description={order.pickupAddress || 'Store Pickup'}
              onPress={() => onSelect(order.id)}
            >
              <View style={[styles.pickupHubPinContainer, isSelected && styles.pickupHubPinSelected]}>
                <MaterialIcons name="storefront" size={16} color={colors.primary} />
              </View>
              {Callout ? (
                <Callout tooltip onPress={() => onSelect(order.id)} style={{ width: 200, alignItems: 'center' }}>
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      Pickup: Store
                    </Text>
                    <Text style={styles.calloutSub} numberOfLines={2}>
                      {order.pickupAddress || APP_CONFIG.STORE_ADDRESS}
                    </Text>
                  </View>
                  <View style={styles.calloutArrow} />
                </Callout>
              ) : null}
            </Marker>
          );
        })}

        {/* Delivery Destination Pins (Matches 'Deliver to' location) */}
        {orders.map((order) => {
          const dCoords = getDeliveryCoords(order);
          if (!dCoords) return null;
          const isSelected = order.id === selectedId || order.id === focusedOrder?.id;
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
                  color={isSelected && !isActive ? '#0A0E17' : isActive ? colors.tertiary : GOLD}
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
      <View style={styles.floatingControls}>
        <Pressable
          style={({ pressed }) => [styles.mapFab, pressed && { opacity: 0.8 }]}
          onPress={handleFitAllStops}
        >
          <MaterialIcons name="center-focus-strong" size={20} color={colors.onSurface} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.mapFab, pressed && { opacity: 0.8 }]}
          onPress={handleRecenterStore}
        >
          <MaterialIcons name="storefront" size={18} color={colors.primary} />
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
  pickupHubPinSelected: {
    backgroundColor: colors.primaryAlpha25,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.18 }],
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
    backgroundColor: GOLD,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  deliveryPinSelectedActive: {
    backgroundColor: colors.greenAlpha15,
    borderColor: colors.tertiary,
    transform: [{ scale: 1.18 }],
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
