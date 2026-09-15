import React, { useMemo, useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, StatusBar, Dimensions } from 'react-native';
import { YStack, SizableText, Button, MapPin, Navigation } from '@blinkdotnew/mobile-ui';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Order } from '@/lib/orders';
import { APP_CONFIG } from '@/lib/config';
import { colors, shadows } from '@/constants/design';
import {
  getDeliveryCoords,
  openMapsNavigation,
  GOLD,
  COBALT,
  ROUTE_ACTIVE,
  ROUTE_PENDING,
} from './mapTypes';
import { ACTIVE_STATUSES } from '@/lib/driverQueue';
import { DestinationPin } from './DestinationPin';
import { useMapOverlays } from './hooks/useMapOverlays';
import { useMapCamera } from './hooks/useMapCamera';
import { useMapGeocoding } from './hooks/useMapGeocoding';
import { MapCalloutTooltip } from './MapCalloutTooltip';

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
  const { width: winWidth, height: winHeight } = Dimensions.get('window');
  const dynamicEdgePadding = useMemo(() => ({
    top: Math.max(25, Math.min(50, Math.round(winHeight * 0.06))),
    bottom: Math.max(35, Math.min(65, Math.round(winHeight * 0.08))),
    left: Math.max(20, Math.min(40, Math.round(winWidth * 0.08))),
    right: Math.max(20, Math.min(40, Math.round(winWidth * 0.08))),
  }), [winWidth, winHeight]);

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

  useMapGeocoding(orders);

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

  const {
    mapRef,
    initialCenter,
    isZoomedIn,
    handleRecenterDriver,
    handleFitAllStops,
    handleRecenterStore,
    handleZoomIn,
    handleZoomOut,
    onRegionChangeComplete,
  } = useMapCamera({
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
  });

  const hubColor = currentTab === 'pending' ? GOLD : COBALT;

  const selectedCalloutInfo = useMemo(() => {
    if (!selectedId) return null;

    const hub = pickupHubs.find((h) => h.orderIds.includes(selectedId));
    if (hub) {
      const hubKey = `hub-${hub.lat.toFixed(4)}-${hub.lng.toFixed(4)}`;
      const offset = pinCollisionOffsets.get(hubKey);
      const coord = offset || { latitude: hub.lat, longitude: hub.lng };
      return {
        id: selectedId,
        coord,
        title: `Pickup Point${hub.orderIds.length > 1 ? ` (${hub.orderIds.length} orders)` : ''}`,
        subtitle: hub.address,
      };
    }

    const deliveryOrder = validDeliveryOrders.find((o) => o.id === selectedId);
    if (deliveryOrder) {
      const dCoords = getDeliveryCoords(deliveryOrder);
      if (!dCoords) return null;
      const offset = pinCollisionOffsets.get(`delivery-${deliveryOrder.id}`);
      const coord = offset || { latitude: dCoords.lat, longitude: dCoords.lng };
      const activeIndex = active.findIndex((a) => a.id === deliveryOrder.id);
      const isActive = activeIndex >= 0;
      const stopNumber = isActive ? activeIndex + 1 : null;
      return {
        id: deliveryOrder.id,
        coord,
        title: isActive ? `Stop #${stopNumber}: Drop Point` : 'Drop Point',
        subtitle: deliveryOrder.deliveryAddress,
      };
    }

    return null;
  }, [selectedId, pickupHubs, validDeliveryOrders, pinCollisionOffsets, active]);

  const routePolylines = useMemo(() => {
    if (!Polyline || !hasActiveRoute || !targetRouteOrder) return [];
    const lines: React.ReactElement[] = [];

    if (routeCoordinates.length >= 2) {
      lines.push(
        <Polyline
          key={`route-base-${targetRouteOrder.id}`}
          coordinates={routeCoordinates}
          strokeColor="rgba(0, 0, 0, 0.7)"
          strokeWidth={Platform.OS === 'ios' ? 6 : 7}
        />
      );
      lines.push(
        <Polyline
          key={`route-color-${targetRouteOrder.id}`}
          coordinates={routeCoordinates}
          strokeColor={
            targetRouteOrder.status && ACTIVE_STATUSES.includes(targetRouteOrder.status)
              ? ROUTE_ACTIVE
              : ROUTE_PENDING
          }
          strokeWidth={Platform.OS === 'ios' ? 3.8 : 4.2}
        />
      );
    }

    if (approachCoordinates.length >= 2) {
      lines.push(
        <Polyline
          key={`route-approach-${targetRouteOrder.id}`}
          coordinates={approachCoordinates}
          strokeColor={
            targetRouteOrder.status && ACTIVE_STATUSES.includes(targetRouteOrder.status)
              ? 'rgba(179, 197, 255, 0.95)'
              : 'rgba(255, 227, 153, 0.95)'
          }
          strokeWidth={Platform.OS === 'ios' ? 2.5 : 3}
          lineDashPattern={[5, 5]}
          lineCap="round"
        />
      );
    }

    return lines;
  }, [Polyline, hasActiveRoute, targetRouteOrder, routeCoordinates, approachCoordinates]);

  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const markerRefs = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    const timer = setTimeout(() => {
      const marker =
        markerRefs.current.get(`delivery-${selectedId}`) ||
        markerRefs.current.get(`pickup-${selectedId}`);
      marker?.showCallout?.();
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedId]);

  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentTab, selectedId, validDeliveryOrders.length]);

  if (!MapView || !Marker) {
    return <NativeFallbackMap orders={orders} selectedId={selectedId} onSelect={onSelect} />;
  }

  return (
    <View style={styles.mapContainer}>
      <MapView
        key={`map-${currentTab}`}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        showsBuildings={true}
        initialRegion={{
          latitude: initialCenter.lat,
          longitude: initialCenter.lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >

        {pickupHubs.map((hub) => {
          const isSelected = Boolean(selectedId && hub.orderIds.includes(selectedId));
          const hubKey = `hub-${hub.lat.toFixed(4)}-${hub.lng.toFixed(4)}`;
          const offset = pinCollisionOffsets.get(hubKey);
          const coord = offset || { latitude: hub.lat, longitude: hub.lng };
          return (
            <Marker
              ref={(ref: any) => {
                if (ref) {
                  hub.orderIds.forEach((id) => markerRefs.current.set(`pickup-${id}`, ref));
                } else {
                  hub.orderIds.forEach((id) => markerRefs.current.delete(`pickup-${id}`));
                }
              }}
              key={hubKey}
              coordinate={coord}
              zIndex={isSelected ? 150 : 50}
              tracksViewChanges={tracksViewChanges}
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
              {Platform.OS === 'ios' && Callout ? (
                <Callout tooltip onPress={() => onSelect(hub.orderIds[0])} style={{ width: 200, alignItems: 'center' }}>
                  <MapCalloutTooltip
                    title={`Pickup Point${hub.orderIds.length > 1 ? ` (${hub.orderIds.length} orders)` : ''}`}
                    subtitle={hub.address}
                  />
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
              ref={(ref: any) => {
                if (ref) {
                  markerRefs.current.set(`delivery-${order.id}`, ref);
                } else {
                  markerRefs.current.delete(`delivery-${order.id}`);
                }
              }}
              key={`delivery-${order.id}`}
              coordinate={coord}
              zIndex={markerZIndex}
              tracksViewChanges={tracksViewChanges}
              onPress={() => onSelect(order.id)}
            >
              <DestinationPin
                isActive={isActive}
                stopNumber={stopNumber}
                isSelected={isSelected}
              />
              {Platform.OS === 'ios' && Callout ? (
                <Callout tooltip onPress={() => onSelect(order.id)} style={{ width: 200, alignItems: 'center' }}>
                  <MapCalloutTooltip
                    title={isActive ? `Stop #${stopNumber}: Drop Point` : 'Drop Point'}
                    subtitle={order.deliveryAddress}
                  />
                </Callout>
              ) : null}
            </Marker>
          );
        })}

       
        {routePolylines}
      </MapView>
      {Platform.OS === 'android' && selectedCalloutInfo && (
        <View
          style={[styles.androidFloatingCallout, { top: insets.top ? insets.top + 10 : 52 }]}
          pointerEvents="box-none"
        >
          <MapCalloutTooltip
            title={selectedCalloutInfo.title}
            subtitle={selectedCalloutInfo.subtitle}
            showArrow={false}
            onClose={() => onSelect(null)}
          />
        </View>
      )}

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
  androidFloatingCallout: {
    position: 'absolute',
    left: 16,
    right: 68,
    zIndex: 100,
    alignItems: 'flex-start',
  },
});
