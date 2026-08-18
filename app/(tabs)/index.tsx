import React, { useState, useMemo, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  Platform,
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  SafeArea,
  Spinner,
  Wifi,
  WifiOff,
  Package,
  Zap,
  X,
} from '@blinkdotnew/mobile-ui';

import * as Haptics from 'expo-haptics';

import { useOrders, Order, ordersTable } from '@/lib/orders';
import { useOrdersRealtime } from '@/lib/realtime';
import { blink } from '@/lib/blink';
import { DriverOrderCard } from '@/components/DriverOrderCard';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useDriverQueue, MAX_QUEUE } from '@/lib/driverQueue';
import { useDriverId } from '@/hooks/useDriverId';

const GOLD = '#E5A93C';
const GREEN = '#22C55E';
const BG = '#000000';

function haptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function SearchIcon({ size = 15, color = '#777777' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="11" cy="11" r="8" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  );
}

function SlidersHorizontalIcon({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="21" y1="4" x2="14" y2="4" />
      <Line x1="10" y1="4" x2="3" y2="4" />
      <Line x1="21" y1="12" x2="12" y2="12" />
      <Line x1="8" y1="12" x2="3" y2="12" />
      <Line x1="21" y1="20" x2="16" y2="20" />
      <Line x1="12" y1="20" x2="3" y2="20" />
      <Line x1="14" y1="2" x2="14" y2="6" />
      <Line x1="8" y1="10" x2="8" y2="14" />
      <Line x1="16" y1="18" x2="16" y2="22" />
    </Svg>
  );
}

export default function OrdersScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [inserting, setInserting] = useState(false);

  const { data: orders = [], isLoading, refetch } = useOrders();
  const { isConnected } = useOrdersRealtime();
  const { user } = useAuth();
  const driverId = useDriverId();
  const { queueCount, atCapacity, isMyOrder } = useDriverQueue(orders, driverId);

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);

  const filtered = useMemo(() => {
    if (!search.trim()) return pendingOrders;
    const q = search.toLowerCase();
    return pendingOrders.filter(
      (o) =>
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.toLowerCase().includes(q) ||
        o.deliveryAddress?.toLowerCase().includes(q) ||
        o.pickupAddress?.toLowerCase().includes(q)
    );
  }, [pendingOrders, search]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'pending').length,
    [orders]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  async function insertTestOrder() {
    haptic();
    setInserting(true);
    try {
      const testOrderData = {
        customer_name: 'Test Customer',
        customer_phone: '(520) 555-0100',
        customer_email: 'test@example.com',
        pickup_address: '350 W Sahuarita Rd, Sahuarita, AZ 85629',
        delivery_address: '233 E La Huerta, Green Valley, AZ 85614',
        items: 'Pickup Runner — Test Order',
        status: 'pending',
        distance_miles: 8.2,
        tip_amount: 500,
        payment_status: 'unpaid',
        city_id: 'sahuarita',
        store_id: '',
        order_scope: 'sahuarita',
      };
      // Direct REST (with secret key) first; SDK fallback.
      try {
        const { blinkDbCreate } = await import('@/lib/blinkApi');
        await blinkDbCreate('orders', testOrderData);
      } catch (restErr: any) {
        console.warn('[insertTestOrder] REST failed, trying SDK fallback:', restErr?.message);
        await ordersTable.create(testOrderData as any);
      }
      await refetch();
    } finally {
      setInserting(false);
    }
  }

  const ListHeader = (
    <View style={styles.headerContainer}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.titleColumn}>
          <Text style={styles.headerTitle}>Orders</Text>
          <Text style={styles.headerSubtitle}>
            <Text style={styles.headerSubtitleGold}>{pendingCount}</Text> pending • Tap Accept to grab orders
          </Text>
        </View>

        <View style={styles.topRightControls}>
          {/* My Queue Pill */}
          <View
            style={[
              styles.queuePill,
              atCapacity
                ? styles.queueFull
                : queueCount > 0
                ? styles.queuePartial
                : styles.queueEmpty,
            ]}
          >
            <Package size={12} color="#E2E8F0" />
            <Text style={styles.queueText}>
              My Queue {queueCount}/{MAX_QUEUE}
            </Text>
          </View>

          {/* Live Status Pill with Green Dot */}
          <View style={[styles.livePill, isConnected ? styles.livePillOn : styles.livePillOff]}>
            {isConnected ? <Wifi size={12} color={GREEN} /> : <WifiOff size={12} color="#888" />}
            <Text style={[styles.liveText, isConnected ? styles.liveTextOn : styles.liveTextOff]}>
              {isConnected ? 'Live' : 'Offline'}
            </Text>
            {isConnected && <View style={styles.liveDot} />}
          </View>

          {/* Test / Bolt Button */}
          <Pressable
            onPress={insertTestOrder}
            disabled={inserting}
            style={({ pressed }) => [
              styles.boltButton,
              pressed && { opacity: 0.75, transform: [{ scale: 0.94 }] },
            ]}
          >
            {inserting ? (
              <Spinner size="small" color={GOLD} />
            ) : (
              <Zap size={16} color={GOLD} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Search and Filter Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <SearchIcon size={16} color="#777777" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, phone, address..."
            placeholderTextColor="#777777"
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && Platform.OS === 'android' && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={16} color="#777777" />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => haptic()}
          style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.75 }]}
        >
          <SlidersHorizontalIcon size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {isLoading && (
        <YStack alignItems="center" paddingVertical="$6">
          <Spinner size="large" color={GOLD} />
          <SizableText size="$3" color="$color9" marginTop="$3">
            Loading orders…
          </SizableText>
        </YStack>
      )}
    </View>
  );

  const EmptyView = !isLoading ? (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Package size={36} color="rgba(229, 169, 60, 0.4)" />
      </View>
      <Text style={styles.emptyTitle}>
        {search.trim() ? 'No matching orders' : 'No available orders'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {search.trim()
          ? 'Try adjusting your search query'
          : 'New incoming deliveries will appear here in real time.'}
      </Text>
      {!search.trim() && (
        <Button
          marginTop="$4"
          onPress={onRefresh}
          backgroundColor="rgba(229,169,60,0.12)"
          borderColor="rgba(229,169,60,0.35)"
          borderWidth={1}
          color={GOLD}
          size="$3.5"
          borderRadius={12}
        >
          Refresh Orders
        </Button>
      )}
    </View>
  ) : null;

  return (
    <View style={styles.root}>
      <SafeArea>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DriverOrderCard
              order={item}
              isMyOrder={isMyOrder(item.id)}
              driverAtCapacity={atCapacity && !isMyOrder(item.id)}
              driverUserId={driverId}
              driverDisplayName={user?.displayName ?? user?.email ?? driverId?.slice(0, 8)}
              onPress={() => {
                setSelectedOrder(item);
                router.push(`/order/${item.id}`);
              }}
            />
          )}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={EmptyView}
          contentContainerStyle={[styles.list, queueCount > 0 && { paddingBottom: 96 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </SafeArea>

      {/* Floating "My Orders" banner */}
      {queueCount > 0 && (
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push('/(tabs)/active');
          }}
          style={({ pressed }) => [
            styles.floatingBanner,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={styles.floatingBannerInner}>
            <View style={styles.floatingLeft}>
              <Text style={styles.floatingTitle}>Active Deliveries</Text>
              <Text style={styles.floatingSubtitle}>
                {queueCount} order{queueCount > 1 ? 's' : ''} in progress · Tap to manage
              </Text>
            </View>
            <View style={styles.floatingBadge}>
              <Text style={styles.floatingBadgeText}>{queueCount}</Text>
            </View>
            <Text style={styles.floatingArrow}>→</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  list: {
    paddingBottom: 32,
    backgroundColor: BG,
    flexGrow: 1,
  },

  /* Header Container */
  headerContainer: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: BG,
  },

  /* Top Row */
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleColumn: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    fontWeight: '500',
  },
  headerSubtitleGold: {
    color: GOLD,
    fontWeight: '700',
  },

  /* Top Right Controls */
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  queuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#161618',
    borderWidth: 1,
    borderColor: '#2A2A2E',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  queueEmpty: {},
  queuePartial: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  queueFull: {
    borderColor: 'rgba(249, 115, 22, 0.45)',
  },
  queueText: {
    color: '#F1F5F9',
    fontSize: 11,
    fontWeight: '600',
  },

  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#161618',
    borderWidth: 1,
    borderColor: '#2A2A2E',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  livePillOn: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  livePillOff: {},
  liveText: {
    fontSize: 11,
    fontWeight: '700',
  },
  liveTextOn: { color: '#FFFFFF' },
  liveTextOff: { color: '#888888' },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
    marginLeft: 1,
  },

  boltButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1A160E',
    borderWidth: 1.2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Search and Filter Row */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: '#26262A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 7,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '400',
    padding: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: '#26262A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: 'rgba(229, 169, 60, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Floating Banner */
  floatingBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 16,
    backgroundColor: '#18181C',
    borderWidth: 1,
    borderColor: 'rgba(229, 169, 60, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  floatingBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  floatingLeft: { flex: 1 },
  floatingTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  floatingSubtitle: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 11.5, marginTop: 2 },
  floatingBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(229, 169, 60, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBadgeText: { color: GOLD, fontSize: 13, fontWeight: '900' },
  floatingArrow: { color: GOLD, fontSize: 18, fontWeight: '700' },
});

