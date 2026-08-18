import React, { useState, useMemo, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  Platform,
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  SafeArea,
  SearchBar,
  Spinner,
  Wifi,
  WifiOff,
  Package,
  Zap,
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

const BLUE = '#0066FF';
const YELLOW = '#F5C400';
const GREEN = '#22C55E';
const BG = '#0A0A0F';

function haptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        o.deliveryAddress?.toLowerCase().includes(q)
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
        pickup_address: "350 W Sahuarita Rd, Sahuarita, AZ 85629",
        delivery_address: '233 E La Huerta, Green Valley, AZ 85614',
        items: "Pickup Runner — Test Order",
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
    <YStack paddingBottom="$2">
      <LinearGradient
        colors={['#000A1A', '#003380', '#0066FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$4" paddingTop="$2">
          <YStack>
            <SizableText size="$8" fontWeight="900" color="white">Orders</SizableText>
            <SizableText size="$3" color="rgba(255,255,255,0.7)">{pendingCount} pending · tap Accept to grab orders</SizableText>
          </YStack>
          <XStack gap="$2" alignItems="center">
            {/* Queue capacity pill */}
            <View style={[
              styles.queuePill,
              atCapacity ? styles.queueFull : queueCount > 0 ? styles.queuePartial : styles.queueEmpty,
            ]}>
              <Text style={[styles.queueText, atCapacity ? styles.queueTextFull : queueCount > 0 ? styles.queueTextPartial : styles.queueTextEmpty]}>
                MY QUEUE {queueCount}/{MAX_QUEUE}
              </Text>
            </View>
            <View style={[styles.liveChip, isConnected ? styles.liveOn : styles.liveOff]}>
              {isConnected ? <Wifi size={12} color={BLUE} /> : <WifiOff size={12} color="#888" />}
              <Text style={[styles.liveText, isConnected ? styles.liveTextOn : styles.liveTextOff]}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </Text>
            </View>
            <Button
              size="$3"
              onPress={insertTestOrder}
              disabled={inserting}
              backgroundColor="rgba(245,196,0,0.15)"
              borderColor={YELLOW}
              borderWidth={1}
              color={YELLOW}
              icon={inserting ? <Spinner size="small" color={YELLOW} /> : <Zap size={14} color={YELLOW} />}
              paddingHorizontal="$3"
            >
              Test
            </Button>
          </XStack>
        </XStack>
        <YStack paddingHorizontal="$4" paddingTop="$3" paddingBottom="$4">
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, phone, address…" />
        </YStack>
      </LinearGradient>
      {isLoading && (
        <YStack alignItems="center" paddingVertical="$6">
          <Spinner size="large" color={BLUE} />
          <SizableText size="$3" color="$color9" marginTop="$3">Loading orders…</SizableText>
        </YStack>
      )}
    </YStack>
  );

  const EmptyView = !isLoading ? (
    <YStack alignItems="center" justifyContent="center" paddingVertical="$10" paddingHorizontal="$6">
      <Package size={56} color="rgba(255,255,255,0.15)" />
      <SizableText size="$5" fontWeight="700" color="white" marginTop="$4" textAlign="center">
        {search.trim() ? 'No matching orders' : 'No orders yet'}
      </SizableText>
      <SizableText size="$3" color="$color9" marginTop="$2" textAlign="center">
        {search.trim() ? 'Try a different search term' : 'Pull down to refresh or tap ⚡ Test.'}
      </SizableText>
      {!search.trim() && (
        <Button marginTop="$5" onPress={onRefresh} backgroundColor={BLUE} color="white" size="$4">
          Refresh
        </Button>
      )}
    </YStack>
  ) : null;

  return (
    // Use a plain View so the absolutely-positioned modal overlay can escape SafeArea clipping
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} colors={[BLUE]} />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </SafeArea>

      {/* Floating "My Orders" banner — visible when driver has active orders */}
      {queueCount > 0 && (
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push('/(tabs)/active');
          }}
          style={({ pressed }) => [styles.floatingBanner, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
        >
          <View style={styles.floatingBannerInner}>
            <View style={styles.floatingLeft}>
              <Text style={styles.floatingTitle}>My Orders</Text>
              <Text style={styles.floatingSubtitle}>
                {queueCount} active · tap to manage
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
  headerGradient: { paddingTop: 12 },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  liveOn: { backgroundColor: 'rgba(0,102,255,0.15)', borderColor: 'rgba(0,102,255,0.4)' },
  liveOff: { backgroundColor: 'rgba(100,100,100,0.15)', borderColor: 'rgba(100,100,100,0.3)' },
  liveText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  liveTextOn: { color: BLUE },
  liveTextOff: { color: '#888' },
  // Queue pill
  queuePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  queueEmpty:   { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' },
  queuePartial: { backgroundColor: 'rgba(34,197,94,0.15)',   borderColor: 'rgba(34,197,94,0.4)' },
  queueFull:    { backgroundColor: 'rgba(249,115,22,0.18)',  borderColor: 'rgba(249,115,22,0.5)' },
  queueText:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  queueTextEmpty:   { color: 'rgba(255,255,255,0.4)' },
  queueTextPartial: { color: GREEN },
  queueTextFull:    { color: '#F97316' },
  // Floating banner styles
  floatingBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 16,
    backgroundColor: '#0066FF',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  floatingBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  floatingLeft: { flex: 1 },
  floatingTitle: { color: 'white', fontSize: 16, fontWeight: '800' },
  floatingSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 },
  floatingBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  floatingBadgeText: { color: 'white', fontSize: 15, fontWeight: '900' },
  floatingArrow: { color: 'rgba(255,255,255,0.8)', fontSize: 20, fontWeight: '700' },
});
