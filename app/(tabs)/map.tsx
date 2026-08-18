import React, { useState, useRef } from 'react';
import { Platform, StyleSheet, View, Pressable, Linking, ScrollView } from 'react-native';
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  SizableText,
  Card,
  Button,
  Badge,
  AppHeader,
  SafeArea,
  MapPin,
  Navigation,
  Package,
  CheckCircle,
} from '@blinkdotnew/mobile-ui';
import { useOrders, Order } from '@/lib/orders';
import { useOrdersRealtime } from '@/lib/realtime';
import { setSelectedOrder } from '@/lib/selectedOrder';

import { APP_CONFIG } from '@/lib/config';

// Store location — used as map center and fallback for orders without geocoded coords
// Default map center — Sahuarita AZ
const CENTER = { lat: 31.9572, lng: -110.9553 };

// Scatter unresolved orders around the store with small random offsets
function getCoords(order: Order) {
  // Use a stable hash of the order id so coords don't jump on re-render
  let hash = 0;
  for (let i = 0; i < order.id.length; i++) hash = (hash * 31 + order.id.charCodeAt(i)) | 0;
  const lat = CENTER.lat + ((hash % 1000) / 10000) * 0.08;
  const lng = CENTER.lng + (((hash >> 4) % 1000) / 10000) * 0.08;
  return { lat, lng };
}

function openMapsNavigation(address: string) {
  const encoded = encodeURIComponent(address);
  if (Platform.OS === 'ios') {
    Linking.openURL(`maps://maps.apple.com/?daddr=${encoded}`);
  } else if (Platform.OS === 'android') {
    Linking.openURL(`google.navigation:q=${encoded}`);
  } else {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`);
  }
}

// --- Web Map (iframe embed via OpenStreetMap) ---
function WebMap({ orders }: { orders: Order[] }) {
  const pending = orders.filter((o) => o.status === 'pending');
  const lats = pending.map((o) => getCoords(o).lat);
  const lngs = pending.map((o) => getCoords(o).lng);
  const centerLat = lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : CENTER.lat;
  const centerLng = lngs.length ? lngs.reduce((a, b) => a + b, 0) / lngs.length : CENTER.lng;

  // Build OpenStreetMap URL with markers
  const markerParams = pending
    .map((o) => {
      const c = getCoords(o);
      return `marker=${c.lat},${c.lng}`;
    })
    .join('&');

  // Wider bbox for Sahuarita area
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.12},${centerLat - 0.09},${centerLng + 0.12},${centerLat + 0.09}&layer=mapnik&${markerParams}`;

  return (
    <iframe
      src={src}
      style={{ width: '100%', height: '100%', border: 'none' }}
      loading="lazy"
    />
  );
}

// --- Native Map ---
function NativeMap({ orders, selectedId, onSelect }: {
  orders: Order[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  // Dynamic import to avoid web crash
  const MapView = require('react-native-maps').default;
  const { Marker, Callout } = require('react-native-maps');

  const pending = orders.filter((o) => o.status === 'pending');
  const delivered = orders.filter((o) => o.status === 'delivered');

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: CENTER.lat,
        longitude: CENTER.lng,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      }}
      showsUserLocation
      showsMyLocationButton
    >
      {pending.map((order) => {
        const { lat, lng } = getCoords(order);
        return (
          <Marker
            key={order.id}
            coordinate={{ latitude: lat, longitude: lng }}
            pinColor="#FFA000"
            onPress={() => onSelect(order.id)}
          >
            <Callout>
              <View style={{ width: 160, padding: 8 }}>
                <SizableText size="$3" fontWeight="700">{order.customerName}</SizableText>
                <SizableText size="$2" color="$color10">{order.deliveryAddress}</SizableText>
              </View>
            </Callout>
          </Marker>
        );
      })}

      {delivered.map((order) => {
        const { lat, lng } = getCoords(order);
        return (
          <Marker
            key={order.id}
            coordinate={{ latitude: lat, longitude: lng }}
            pinColor="#2E7D32"
          />
        );
      })}
    </MapView>
  );
}

export default function MapScreen() {
  const { data: orders = [], isLoading } = useOrders();
  useOrdersRealtime(); // keep map in sync with realtime events
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedOrder = orders.find((o) => o.id === selectedId);
  const pendingOrders = orders.filter((o) => o.status === 'pending');

  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setSelectedId(null);
    router.push(`/order/${order.id}`);
  };

  return (
    <SafeArea>
      <AppHeader title="Delivery Map" />

      <YStack flex={1}>
        {/* Legend row */}
        <XStack
          paddingHorizontal="$4"
          paddingVertical="$2"
          space="$4"
          backgroundColor="$color2"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <XStack space="$1" alignItems="center">
            <View style={[styles.dot, { backgroundColor: '#FFA000' }]} />
            <SizableText size="$2" color="$color11">Pending ({pendingOrders.length})</SizableText>
          </XStack>
          <XStack space="$1" alignItems="center">
            <View style={[styles.dot, { backgroundColor: '#2E7D32' }]} />
            <SizableText size="$2" color="$color11">Delivered ({orders.length - pendingOrders.length})</SizableText>
          </XStack>
        </XStack>

        {/* Map area */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <WebMap orders={orders} />
          ) : (
            <NativeMap
              orders={orders}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </View>

        {/* Order list / selected order panel */}
        {selectedOrder ? (
          /* Selected order detail card */
          <Card
            margin="$3"
            padding="$4"
            borderRadius="$4"
            backgroundColor="$color2"
            borderWidth={1}
            borderColor="$borderColor"
            elevation={4}
          >
            <YStack space="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <YStack>
                  <SizableText size="$5" fontWeight="700" color="$color12">
                    {selectedOrder.customerName}
                  </SizableText>
                  <SizableText size="$2" color="$color10">
                    Order #{selectedOrder?.id ? selectedOrder.id.slice(-6).toUpperCase() : '------'}
                  </SizableText>
                </YStack>
                <Button
                  size="$2"
                  variant="outlined"
                  borderRadius="$full"
                  onPress={() => setSelectedId(null)}
                >
                  ✕
                </Button>
              </XStack>

              <XStack space="$2" alignItems="center">
                <MapPin size={14} color="$color9" />
                <SizableText size="$3" color="$color11" flex={1}>
                  {selectedOrder.deliveryAddress}
                </SizableText>
              </XStack>

              <XStack space="$2">
                <Button
                  flex={1}
                  size="$4"
                  variant="outlined"
                  borderRadius="$4"
                  icon={<Navigation size={16} />}
                  onPress={() => openMapsNavigation(selectedOrder.deliveryAddress)}
                >
                  Navigate
                </Button>
                {selectedOrder.status === 'pending' && (
                  <Button
                    flex={2}
                    theme="active"
                    size="$4"
                    borderRadius="$4"
                    iconAfter={<CheckCircle size={16} />}
                    onPress={() => handleOpenOrder(selectedOrder)}
                    fontWeight="700"
                  >
                    OPEN ORDER
                  </Button>
                )}
              </XStack>
            </YStack>
          </Card>
        ) : (
          /* Scrollable pending stops list */
          <YStack padding="$3" space="$2">
            <SizableText size="$3" fontWeight="600" color="$color10" paddingHorizontal="$1">
              PENDING STOPS ({pendingOrders.length})
            </SizableText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack space="$2">
                {pendingOrders.map((order) => (
                  <Pressable key={order.id} onPress={() => setSelectedId(order.id)}>
                    <Card
                      padding="$3"
                      borderRadius="$4"
                      backgroundColor="$color2"
                      borderWidth={1}
                      borderColor="$amber5"
                      width={180}
                    >
                      <YStack space="$1">
                        <SizableText size="$3" fontWeight="700" color="$color12" numberOfLines={1}>
                          {order.customerName}
                        </SizableText>
                        <XStack space="$1" alignItems="center">
                          <MapPin size={12} color="$amber9" />
                          <SizableText size="$1" color="$color10" numberOfLines={2} flex={1}>
                            {order.deliveryAddress}
                          </SizableText>
                        </XStack>
                        <XStack space="$1" alignItems="center">
                          <Package size={12} color="$color9" />
                          <SizableText size="$1" color="$color10" numberOfLines={1} flex={1}>
                            {order.items}
                          </SizableText>
                        </XStack>
                      </YStack>
                    </Card>
                  </Pressable>
                ))}
                {pendingOrders.length === 0 && (
                  <YStack padding="$4" alignItems="center">
                    <SizableText size="$3" color="$green9" fontWeight="600">
                      All deliveries complete!
                    </SizableText>
                  </YStack>
                )}
              </XStack>
            </ScrollView>
          </YStack>
        )}
      </YStack>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    minHeight: 260,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
