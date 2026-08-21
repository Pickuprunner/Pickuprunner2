import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  View,
  Text,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { blink } from '@/lib/blink';
import { CustomerOrderCard, CustomerOrderData } from '@/components/Orders';
import { useToast, SkeletonList, CustomConfirmModal } from '@/components/core';

const SESSION_KEY = 'customer_session_id';
const CHANNEL_NAME = 'order-updates';

const STATIC_SAMPLE_ORDERS: CustomerOrderData[] = [
  {
    id: 'ord-6ef6bf-sample',
    customerName: 'Jamie Test',
    customerPhone: '(520) 555-1234',
    pickupAddress: '5765 S Camino del Sol, Green Valley, AZ 85622',
    deliveryAddress: '123 E Test Ave, Sahuarita, AZ 85629',
    items: '[LEAVE AT DOOR] #1042',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    tipAmount: 500,
    distanceMiles: 4.2,
    paymentStatus: 'unpaid',
  },
  {
    id: 'ord-jqspfm-sample',
    customerName: 'Jamie Test',
    customerPhone: '(520) 555-1234',
    pickupAddress: '5765 S Camino del Sol, Green Valley, AZ 85622',
    deliveryAddress: '123 E Test Ave, Sahuarita, AZ 85629',
    items: '[MEET AT DOOR] Hand off at door',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    tipAmount: 1000,
    distanceMiles: 6.8,
    paymentStatus: 'paid',
    driverName: 'Alex Miller',
  },
];

async function getOrCreateSessionId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const id = 'cust-' + Math.random().toString(36).slice(2, 10);
    await AsyncStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return 'cust-' + Math.random().toString(36).slice(2, 10);
  }
}

export default function MyOrdersScreen() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<CustomerOrderData[]>(STATIC_SAMPLE_ORDERS);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [cancelTargetOrder, setCancelTargetOrder] = useState<CustomerOrderData | null>(null);
  const prevStatusMap = useRef<Map<string, string>>(new Map());
  const channelRef = useRef<any>(null);

  const fetchOrders = useCallback(
    async (sid?: string) => {
      const id = sid || sessionId || (await AsyncStorage.getItem(SESSION_KEY));

      // 1. Read locally cached orders from AsyncStorage
      let localOrders: CustomerOrderData[] = [];
      try {
        const raw = await AsyncStorage.getItem('customer_local_orders');
        if (raw) localOrders = JSON.parse(raw);
      } catch { }

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve([]), 3500)
      );

      try {
        const authUser = await blink.auth.me().catch(() => null);
        const userEmail = authUser?.email;

        // 2. Fetch from Blink DB with all filter options
        const fetchPromise = Promise.all([
          id
            ? blink.db.orders
              .list({
                where: { customer_session_id: id },
                orderBy: { created_at: 'desc' },
                limit: 50,
              })
              .catch(() => [])
            : Promise.resolve([]),
          id
            ? blink.db.orders
              .list({
                where: { customerSessionId: id },
                orderBy: { createdAt: 'desc' },
                limit: 50,
              })
              .catch(() => [])
            : Promise.resolve([]),
          userEmail
            ? blink.db.orders
              .list({
                where: { customer_email: userEmail },
                orderBy: { created_at: 'desc' },
                limit: 50,
              })
              .catch(() => [])
            : Promise.resolve([]),
        ]);

        const [sessionOrders1, sessionOrders2, emailOrders] = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as [CustomerOrderData[], CustomerOrderData[], CustomerOrderData[]];

        const orderMap = new Map<string, CustomerOrderData>();
        (STATIC_SAMPLE_ORDERS || []).forEach((o) => o?.id && orderMap.set(o.id, o));
        (localOrders || []).forEach((o) => o?.id && orderMap.set(o.id, o));
        (sessionOrders1 || []).forEach((o) => o?.id && orderMap.set(o.id, o));
        (sessionOrders2 || []).forEach((o) => o?.id && orderMap.set(o.id, o));
        (emailOrders || []).forEach((o) => o?.id && orderMap.set(o.id, o));

        const result = Array.from(orderMap.values()).sort(
          (a, b) =>
            new Date(b.createdAt || b.created_at || 0).getTime() -
            new Date(a.createdAt || a.created_at || 0).getTime()
        );

        setOrders(result);
      } catch (err) {
        console.warn('[my-orders] fetch failed or timed out:', err);
        const orderMap = new Map<string, CustomerOrderData>();
        (STATIC_SAMPLE_ORDERS || []).forEach((o) => o?.id && orderMap.set(o.id, o));
        (localOrders || []).forEach((o) => o?.id && orderMap.set(o.id, o));
        setOrders(Array.from(orderMap.values()));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    let mounted = true;

    async function init() {
      const sid = await getOrCreateSessionId();
      if (!mounted) return;
      setSessionId(sid);
      await fetchOrders(sid);

      try {
        const channel = blink.realtime.channel(CHANNEL_NAME);
        channelRef.current = channel;

        await channel.subscribe({ userId: sid });
        channel.onMessage((msg: any) => {
          if (!mounted) return;
          const data = msg.data || msg;
          if (
            data?.type === 'order:status_change' ||
            data?.type === 'order:created' ||
            data?.type === 'order-changed'
          ) {
            fetchOrders(sid);
          }
        });

        if (mounted) setIsConnected(true);
      } catch (err) {
        console.warn('[my-orders] realtime subscription failed:', err);
        if (mounted) setIsConnected(false);
      }
    }

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch { }
      }
    };
  }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
  }, [fetchOrders]);

  const handleCancel = useCallback((id: string) => {
    const orderToCancel = orders.find((o) => o.id === id) || ({ id } as CustomerOrderData);
    setCancelTargetOrder(orderToCancel);
  }, [orders]);

  const confirmCancel = useCallback(() => {
    if (!cancelTargetOrder) return;
    const id = cancelTargetOrder.id;

    // 1. Instant Optimistic UI Update (0ms delay)
    setCancelTargetOrder(null);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    prevStatusMap.current.delete(id);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    showToast('Pickup request cancelled', {
      type: 'info',
      description: 'Your request has been removed.',
    });

    // 2. Perform local storage & DB deletion in the background without blocking UI
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('customer_local_orders');
        if (raw) {
          const list = JSON.parse(raw);
          const filtered = list.filter((o: any) => o.id !== id);
          await AsyncStorage.setItem('customer_local_orders', JSON.stringify(filtered));
        }
      } catch (err) {
        console.warn('[my-orders] AsyncStorage sync failed:', err);
      }

      try {
        await blink.db.orders.delete(id);
      } catch (err) {
        console.warn('[my-orders] background delete failed:', err);
      }
    })();
  }, [cancelTargetOrder, showToast]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        (o.customerName || o.customer_name || '').toLowerCase().includes(q) ||
        (o.customerPhone || o.customer_phone || '').toLowerCase().includes(q) ||
        (o.pickupAddress || o.pickup_address || '').toLowerCase().includes(q) ||
        (o.deliveryAddress || o.delivery_address || '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  const renderItem = useCallback(
    ({ item, index }: { item: CustomerOrderData; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <CustomerOrderCard order={item} onCancel={handleCancel} />
      </Animated.View>
    ),
    [handleCancel]
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Orders</Text>
            <Text style={styles.headerSubtitle}>
              View and track all your pickup requests
            </Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#8C90A1" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, phone, address..."
              placeholderTextColor="#8C90A1"
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
          </View>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
              }
              showToast('Showing all recent orders', { type: 'info' });
            }}
            activeOpacity={0.8}
            style={styles.filterButton}
          >
            <MaterialIcons name="tune" size={20} color="#dfe2ef" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffe399"
          />
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonList count={3} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Matching Orders</Text>
              <Text style={styles.emptySubtitle}>
                {search.trim()
                  ? 'Try adjusting your search query'
                  : 'New pickup requests will appear here in real time.'}
              </Text>
            </View>
          )
        }
      />

      <CustomConfirmModal
        visible={!!cancelTargetOrder}
        variant="danger"
        message="This will remove your order from the live dispatch."
        confirmText="Cancel Pickup"
        cancelText="Keep It"
        orderId={cancelTargetOrder?.id}
        onClose={() => setCancelTargetOrder(null)}
        onConfirm={confirmCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f131c',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 64 : 56,
    paddingBottom: 12,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#dfe2ef',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8C90A1',
    marginTop: 2,
    fontWeight: '500',
  },
  goldHighlight: {
    color: '#ffe399',
    fontWeight: '800',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00E297',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00E297',
    letterSpacing: 0.8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  searchBar: {
    flex: 1,
    height: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#dfe2ef',
    fontSize: 14,
    height: '100%',
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 100,
    flexGrow: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8C90A1',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#dfe2ef',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8C90A1',
    textAlign: 'center',
  },
});
