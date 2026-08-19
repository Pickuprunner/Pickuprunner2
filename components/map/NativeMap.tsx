import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { YStack, SizableText, Button, MapPin, Navigation } from '@blinkdotnew/mobile-ui';
import { Order } from '@/lib/orders';
import { APP_CONFIG } from '@/lib/config';
import { CENTER, getCoords, openMapsNavigation, GOLD, CYAN } from './mapTypes';

function NativeFallbackMap({
  orders,
}: {
  orders: Order[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const pending = orders.filter((o) => o.status === 'pending');
  return (
    <YStack flex={1} padding="$4" gap="$3" justifyContent="center" alignItems="center" backgroundColor="#0A0B10">
      <YStack
        width={60}
        height={60}
        borderRadius={30}
        backgroundColor="rgba(229,169,60,0.15)"
        borderWidth={1.5}
        borderColor="rgba(229,169,60,0.4)"
        alignItems="center"
        justifyContent="center"
      >
        <MapPin size={30} color={GOLD} />
      </YStack>
      <SizableText size="$5" fontWeight="800" textAlign="center" color="#FFFFFF">
        Sahuarita Delivery Routes
      </SizableText>
      <SizableText size="$2" color="#94A3B8" textAlign="center" paddingHorizontal="$4">
        {pending.length} pending deliveries available. Tap any order below to view route details or open in maps.
      </SizableText>
      <Button
        size="$3"
        backgroundColor="rgba(229,169,60,0.15)"
        borderColor="rgba(229,169,60,0.4)"
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
  let MapView: any = null;
  let Marker: any = null;
  let Callout: any = null;

  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    Callout = Maps.Callout;
  } catch (err) {
    console.warn('[map] react-native-maps not available, using fallback view');
  }

  if (!MapView || !Marker) {
    return <NativeFallbackMap orders={orders} selectedId={selectedId} onSelect={onSelect} />;
  }

  const pending = orders.filter((o) => o.status === 'pending');
  const active = orders.filter((o) => o.status === 'accepted' || o.status === 'picked_up');

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: CENTER.lat,
        longitude: CENTER.lng,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
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
            title={order.customerName || 'Customer'}
            description={order.deliveryAddress}
            pinColor={GOLD}
            onPress={() => onSelect(order.id)}
          >
            {Callout ? (
              <Callout tooltip onPress={() => onSelect(order.id)} style={{ width: 190, alignItems: 'center' }}>
                <View style={{ width: 190, padding: 10, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', elevation: 4 }}>
                  <Text style={{ fontWeight: '800', fontSize: 13, color: '#0F172A', marginBottom: 2 }} numberOfLines={1}>
                    {order.customerName || 'Customer'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#475569', lineHeight: 15 }} numberOfLines={2}>
                    {order.deliveryAddress}
                  </Text>
                </View>
                <View style={{ width: 10, height: 10, backgroundColor: '#FFFFFF', marginTop: -5, transform: [{ rotate: '45deg' }] }} />
              </Callout>
            ) : null}
          </Marker>
        );
      })}

      {active.map((order) => {
        const { lat, lng } = getCoords(order);
        return (
          <Marker
            key={order.id}
            coordinate={{ latitude: lat, longitude: lng }}
            title={order.customerName || 'Customer'}
            description={order.deliveryAddress}
            pinColor={CYAN}
            onPress={() => onSelect(order.id)}
          >
            {Callout ? (
              <Callout tooltip onPress={() => onSelect(order.id)} style={{ width: 190, alignItems: 'center' }}>
                <View style={{ width: 190, padding: 10, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', elevation: 4 }}>
                  <Text style={{ fontWeight: '800', fontSize: 13, color: '#0F172A', marginBottom: 2 }} numberOfLines={1}>
                    {order.customerName || 'Customer'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#475569', lineHeight: 15 }} numberOfLines={2}>
                    {order.deliveryAddress}
                  </Text>
                </View>
                <View style={{ width: 10, height: 10, backgroundColor: '#FFFFFF', marginTop: -5, transform: [{ rotate: '45deg' }] }} />
              </Callout>
            ) : null}
          </Marker>
        );
      })}
    </MapView>
  );
}
