import React, { useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, StatusBar } from 'react-native';
import { YStack, SizableText, Button, MapPin, Navigation } from '@blinkdotnew/mobile-ui';
import { MaterialIcons } from '@expo/vector-icons';
import { Order } from '@/lib/orders';
import { APP_CONFIG } from '@/lib/config';
import { colors, shadows } from '@/constants/design';
import { CENTER, getCoords, openMapsNavigation, GOLD, COBALT, DARK_MAP_STYLE, haptic } from './mapTypes';

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
        Sahuarita Delivery Routes
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

  if (!MapView || !Marker) {
    return <NativeFallbackMap orders={orders} selectedId={selectedId} onSelect={onSelect} />;
  }

  const pending = orders.filter((o) => o.status === 'pending');
  const active = orders.filter((o) => o.status === 'accepted' || o.status === 'picked_up');

  const focusedOrder = orders.find((o) => o.id === selectedId) || active[0] || null;
  const focusedCoords = focusedOrder ? getCoords(focusedOrder) : null;

  const handleFitAllStops = () => {
    haptic('light');
    if (!mapRef.current) return;
    const allCoords = [
      { latitude: CENTER.lat, longitude: CENTER.lng },
      ...orders.map((o) => {
        const { lat, lng } = getCoords(o);
        return { latitude: lat, longitude: lng };
      }),
    ];

    if (allCoords.length > 0) {
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 70, right: 40, bottom: 90, left: 40 },
        animated: true,
      });
    } else {
      mapRef.current.animateToRegion({
        latitude: CENTER.lat,
        longitude: CENTER.lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
    }
  };

  const handleRecenterStore = () => {
    haptic('light');
    if (!mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: CENTER.lat,
      longitude: CENTER.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
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
          latitude: CENTER.lat,
          longitude: CENTER.lng,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* Dashed Route Line from Store to Focused Order Destination */}
        {Polyline && focusedCoords && (
          <Polyline
            coordinates={[
              { latitude: CENTER.lat, longitude: CENTER.lng },
              { latitude: focusedCoords.lat, longitude: focusedCoords.lng },
            ]}
            strokeColor={COBALT}
            strokeWidth={3.5}
            lineDashPattern={[8, 6]}
          />
        )}

        {/* Store Hub Pickup Pin (Matches 'Pick up from' node) */}
        <Marker
          coordinate={{ latitude: CENTER.lat, longitude: CENTER.lng }}
          title="Pickup Hub"
          description={APP_CONFIG.STORE_ADDRESS}
          onPress={handleRecenterStore}
        >
          <View style={styles.pickupHubPinContainer}>
            <MaterialIcons name="inventory-2" size={15} color={colors.primary} />
          </View>
          {Callout ? (
            <Callout tooltip style={{ width: 170, alignItems: 'center' }}>
              <View style={styles.calloutCard}>
                <Text style={styles.calloutTitle} numberOfLines={1}>
                  Pickup: Store Hub
                </Text>
                <Text style={styles.calloutSub} numberOfLines={1}>
                  {APP_CONFIG.STORE_ADDRESS}
                </Text>
              </View>
              <View style={styles.calloutArrow} />
            </Callout>
          ) : null}
        </Marker>

        {/* Pending Order Delivery Destination Pins (Matches 'Deliver to' node) */}
        {pending.map((order) => {
          const { lat, lng } = getCoords(order);
          const isSelected = order.id === selectedId;
          return (
            <Marker
              key={order.id}
              coordinate={{ latitude: lat, longitude: lng }}
              title={order.customerName || 'Customer'}
              description={order.deliveryAddress}
              onPress={() => onSelect(order.id)}
            >
              <View style={[styles.deliveryPinContainer, isSelected && styles.deliveryPinSelectedPending]}>
                <MaterialIcons
                  name="location-on"
                  size={15}
                  color={isSelected ? '#0A0E17' : GOLD}
                />
              </View>
              {Callout ? (
                <Callout tooltip onPress={() => onSelect(order.id)} style={{ width: 200, alignItems: 'center' }}>
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      {order.customerName || 'Customer'}
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

        {/* Active Order Delivery Destination Pins (Matches 'Deliver to' node) */}
        {active.map((order) => {
          const { lat, lng } = getCoords(order);
          const isSelected = order.id === selectedId;
          return (
            <Marker
              key={order.id}
              coordinate={{ latitude: lat, longitude: lng }}
              title={order.customerName || 'Customer'}
              description={order.deliveryAddress}
              onPress={() => onSelect(order.id)}
            >
              <View
                style={[
                  styles.deliveryPinContainer,
                  styles.deliveryPinActive,
                  isSelected && styles.deliveryPinSelectedActive,
                ]}
              >
                <MaterialIcons name="location-on" size={15} color={colors.tertiary} />
              </View>
              {Callout ? (
                <Callout tooltip onPress={() => onSelect(order.id)} style={{ width: 200, alignItems: 'center' }}>
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      {order.customerName || 'Active Order'}
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
          <MaterialIcons name="inventory-2" size={18} color={colors.primary} />
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

