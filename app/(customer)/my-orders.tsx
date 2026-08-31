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
import { ordersApi } from '@/apis/orders';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useOrdersRealtime } from '@/lib/realtime';
import {
  CustomerOrderCard,
  CustomerOrderData,
  CustomerOrderFilterModal,
  CustomerFilterState,
} from '@/components/Orders';
import { useToast, SkeletonList, CustomConfirmModal, CustomLoading } from '@/components/core';

const SESSION_KEY = 'customer_session_id';
const CHANNEL_NAME = 'order-updates';

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
  const storeOrders = useOrderStore((state) => state.orders);
  const [orders, setOrders] = useState<CustomerOrderData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<CustomerFilterState>({
    status: 'all',
    dateRange: 'all',
    sortBy: 'newest',
  });
  const [cancelTargetOrder, setCancelTargetOrder] = useState<CustomerOrderData | null>(null);
  const prevStatusMap = useRef<Map<string, string>>(new Map());
  const channelRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);

  const fetchOrders = useCallback(
    async (sid?: string) => {
      const id = sid || sessionIdRef.current || sessionId || (await AsyncStorage.getItem(SESSION_KEY));

      let localOrders: CustomerOrderData[] = [];
      try {
        const raw = await AsyncStorage.getItem('customer_local_orders');
        if (raw) localOrders = JSON.parse(raw);
      } catch { }

      const timeoutPromise = new Promise<any[]>((resolve) =>
        setTimeout(() => resolve([[], [], [], []]), 3500)
      );

      try {
        const authUser = await blink.auth.me().catch(() => null);
        const userEmail = authUser?.email || useAuthStore.getState().user?.email;
        const token = useAuthStore.getState().token;

        const fetchPromise = Promise.all([
          token ? ordersApi.getMine().catch(() => []) : Promise.resolve([]),
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

        const [backendMine, sessionOrders1, sessionOrders2, emailOrders] = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as [CustomerOrderData[], CustomerOrderData[], CustomerOrderData[], CustomerOrderData[]];

        const orderMap = new Map<string, CustomerOrderData>();

        (localOrders || []).forEach((o) => {
          if (o?.id) orderMap.set(o.id, o);
        });

        (sessionOrders1 || []).forEach((o) => o?.id && orderMap.set(o.id, o));
        (sessionOrders2 || []).forEach((o) => o?.id && orderMap.set(o.id, o));
        (emailOrders || []).forEach((o) => o?.id && orderMap.set(o.id, o));

        (backendMine || []).forEach((o) => {
          if (o?.id) {
            orderMap.set(o.id, o);
            useOrderStore.getState().upsertOrder(o as any);
          }
        });

        const activeIds = Array.from(orderMap.values())
          .filter((o) => o?.id && o.status !== 'delivered' && o.status !== 'cancelled')
          .map((o) => o.id);

        if (activeIds.length > 0) {
          const directFetches = await Promise.allSettled(
            activeIds.map((orderId) => ordersApi.getById(orderId))
          );
          directFetches.forEach((res) => {
            if (res.status === 'fulfilled' && res.value && res.value.id) {
              const fresh = res.value;
              const existing = orderMap.get(fresh.id);
              const merged: CustomerOrderData = {
                ...(existing || {}),
                ...(fresh as any),
                status: fresh.status as any,
                driverName: fresh.driverName || (fresh as any).driver_name || existing?.driverName,
                driver_name: fresh.driverName || (fresh as any).driver_name || existing?.driver_name,
                paymentStatus: fresh.paymentStatus || (fresh as any).payment_status || existing?.paymentStatus,
                payment_status: (fresh as any).payment_status || fresh.paymentStatus || existing?.payment_status,
              };
              orderMap.set(fresh.id, merged);
              useOrderStore.getState().upsertOrder(fresh as any);
            }
          });
        }

        const result = Array.from(orderMap.values()).sort(
          (a, b) =>
            new Date(b.createdAt || b.created_at || 0).getTime() -
            new Date(a.createdAt || a.created_at || 0).getTime()
        );

        setOrders(result);

        try {
          await AsyncStorage.setItem('customer_local_orders', JSON.stringify(result));
        } catch { }
      } catch (err) {
        console.warn('[my-orders] fetch failed or timed out:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    if (storeOrders && storeOrders.length > 0) {
      setOrders((prev) => {
        if (!prev || prev.length === 0) return prev;
        const orderMap = new Map<string, CustomerOrderData>();
        prev.forEach((o) => o?.id && orderMap.set(o.id, o));
        let changed = false;
        storeOrders.forEach((so) => {
          if (so?.id && orderMap.has(so.id)) {
            const existing = orderMap.get(so.id);
            const soName = (so.customerName || so.customer_name || '').trim();
            const existName = (existing?.customerName || existing?.customer_name || '').trim();
            const finalName =
              soName && soName !== 'Customer' && soName !== 'Customer Order'
                ? soName
                : existName || soName || 'Customer';

            orderMap.set(so.id, {
              ...(existing || {}),
              id: so.id,
              status: so.status as any,
              customerName: finalName,
              customerPhone: so.customerPhone || so.customer_phone || existing?.customerPhone,
              pickupAddress: so.pickupAddress || existing?.pickupAddress || '',
              deliveryAddress: so.deliveryAddress || existing?.deliveryAddress || '',
              items: so.items || existing?.items || '',
              driverName: so.driverName || existing?.driverName,
              driver_name: so.driverName || existing?.driver_name,
              driverUserId: so.driverUserId || (existing as any)?.driverUserId,
              deliveryPhotoUrl: so.deliveryPhotoUrl || existing?.deliveryPhotoUrl,
              delivery_photo_url: so.deliveryPhotoUrl || existing?.delivery_photo_url,
              tipAmount: so.tipAmount ?? existing?.tipAmount,
              distanceMiles: so.distanceMiles ?? existing?.distanceMiles,
              createdAt: so.createdAt || existing?.createdAt,
              paymentStatus: so.paymentStatus || (so as any).payment_status || existing?.paymentStatus || existing?.payment_status,
              payment_status: (so as any).payment_status || so.paymentStatus || existing?.payment_status || existing?.paymentStatus,
            } as any);
            changed = true;
          }
        });
        if (!changed) return prev;
        return Array.from(orderMap.values()).sort(
          (a, b) =>
            new Date(b.createdAt || b.created_at || 0).getTime() -
            new Date(a.createdAt || a.created_at || 0).getTime()
        );
      });
    }
  }, [storeOrders]);

  useOrdersRealtime(useCallback(() => {
    fetchOrders();
  }, [fetchOrders]));

  useEffect(() => {
    let mounted = true;

    async function init() {
      const sid = await getOrCreateSessionId();
      if (!mounted) return;
      sessionIdRef.current = sid;
      setSessionId(sid);
      await fetchOrders(sid);

      try {
        const channel = blink.realtime.channel(CHANNEL_NAME);
        channelRef.current = channel;

        await channel.subscribe({ userId: sid });
        channel.onMessage((msg: any) => {
          if (!mounted) return;
          fetchOrders(sid);
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
    try {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 550));
      await Promise.all([fetchOrders(), minDelay]);
    } catch {
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders]);

  const handleCancel = useCallback((id: string) => {
    const orderToCancel = orders.find((o) => o.id === id) || ({ id } as CustomerOrderData);
    setCancelTargetOrder(orderToCancel);
  }, [orders]);

  const confirmCancel = useCallback(() => {
    if (!cancelTargetOrder) return;
    const id = cancelTargetOrder.id;

    setCancelTargetOrder(null);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    prevStatusMap.current.delete(id);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }

    showToast('Pickup request cancelled', {
      type: 'info',
      description: 'Your request has been removed.',
    });

    (async () => {
      try {
        await ordersApi.update(id, { status: 'cancelled' });
      } catch (apiErr) {
        console.warn('[my-orders] ordersApi.update cancel failed:', apiErr);
      }

      useOrderStore.getState().updateOrder(id, { status: 'cancelled' });

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

  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      active: orders.filter((o) =>
        ['assigned', 'accepted', 'shopping', 'picked_up', 'en_route'].includes(o.status)
      ).length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };
  }, [orders]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.sortBy !== 'newest') count++;
    return count;
  }, [filters]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((o) => {
        const idStr = (o.id || '').toLowerCase();
        const custName = (o.customerName || o.customer_name || '').toLowerCase();
        const phone = (o.customerPhone || o.customer_phone || '').toLowerCase();
        const email = (o.customerEmail || o.customer_email || '').toLowerCase();
        const pickup = (o.pickupAddress || o.pickup_address || '').toLowerCase();
        const delivery = (o.deliveryAddress || o.delivery_address || '').toLowerCase();
        const items = (o.items || '').toLowerCase();
        const driver = (o.driverName || o.driver_name || '').toLowerCase();
        const status = (o.status || '').toLowerCase();
        const payment = (o.paymentStatus || o.payment_status || '').toLowerCase();

        return (
          idStr.includes(q) ||
          custName.includes(q) ||
          phone.includes(q) ||
          email.includes(q) ||
          pickup.includes(q) ||
          delivery.includes(q) ||
          items.includes(q) ||
          driver.includes(q) ||
          status.includes(q) ||
          payment.includes(q)
        );
      });
    }

    if (filters.status !== 'all') {
      if (filters.status === 'active') {
        result = result.filter((o) =>
          ['assigned', 'accepted', 'shopping', 'picked_up', 'en_route'].includes(o.status)
        );
      } else {
        result = result.filter((o) => o.status === filters.status);
      }
    }

    if (filters.dateRange !== 'all') {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const sevenDays = 7 * oneDay;
      const thirtyDays = 30 * oneDay;

      result = result.filter((o) => {
        const orderTime = new Date(o.createdAt || o.created_at || 0).getTime();
        if (!orderTime) return true;
        const diff = now - orderTime;

        if (filters.dateRange === 'today') return diff <= oneDay;
        if (filters.dateRange === 'week') return diff <= sevenDays;
        if (filters.dateRange === 'month') return diff <= thirtyDays;
        return true;
      });
    }

    result = [...result].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || 0).getTime();

      if (filters.sortBy === 'oldest') return timeA - timeB;
      return timeB - timeA;
    });

    return result;
  }, [orders, search, filters]);

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
              setIsFilterModalVisible(true);
            }}
            activeOpacity={0.8}
            style={[
              styles.filterButton,
              activeFilterCount > 0 && styles.filterButtonActive,
            ]}
          >
            <MaterialIcons
              name="tune"
              size={20}
              color={activeFilterCount > 0 ? '#ffe399' : '#dfe2ef'}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {activeFilterCount > 0 && (
          <View style={styles.activeFiltersRow}>
            {filters.status !== 'all' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFilters((prev) => ({ ...prev, status: 'all' }))}
                style={styles.activeFilterChip}
              >
                <Text style={styles.activeFilterChipText}>
                  Status: {filters.status === 'active' ? 'In Progress' : filters.status.toUpperCase()}
                </Text>
                <MaterialIcons name="close" size={14} color="#ffe399" />
              </TouchableOpacity>
            )}

            {filters.dateRange !== 'all' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFilters((prev) => ({ ...prev, dateRange: 'all' }))}
                style={styles.activeFilterChip}
              >
                <Text style={styles.activeFilterChipText}>
                  Date: {filters.dateRange === 'today' ? 'Today' : filters.dateRange === 'week' ? 'Past 7d' : 'Past 30d'}
                </Text>
                <MaterialIcons name="close" size={14} color="#ffe399" />
              </TouchableOpacity>
            )}

            {filters.sortBy !== 'newest' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFilters((prev) => ({ ...prev, sortBy: 'newest' }))}
                style={styles.activeFilterChip}
              >
                <Text style={styles.activeFilterChipText}>
                  Sort: {filters.sortBy === 'oldest' ? 'Oldest First' : 'Newest First'}
                </Text>
                <MaterialIcons name="close" size={14} color="#ffe399" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                setFilters({ status: 'all', dateRange: 'all', sortBy: 'newest' })
              }
              style={styles.clearAllButton}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
          />
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonList count={3} />
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <MaterialIcons
                  name={search.trim() || activeFilterCount > 0 ? 'search-off' : 'inventory-2'}
                  size={52}
                  color="#FFE399"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {search.trim() || activeFilterCount > 0 ? 'No Matching Orders' : 'No Orders Placed Yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search.trim() || activeFilterCount > 0
                  ? 'Try adjusting your search query or reset your filters.'
                  : 'Place your first pickup request to track its live status here.'}
              </Text>
              {search.trim() || activeFilterCount > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setSearch('');
                    setFilters({ status: 'all', dateRange: 'all', sortBy: 'newest' });
                  }}
                  style={styles.resetFiltersBtn}
                >
                  <Text style={styles.resetFiltersBtnText}>Reset All Filters</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(customer)')}
                  style={styles.createOrderBtn}
                >
                  <Text style={styles.createOrderBtnText}>Request a Pickup</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      <CustomerOrderFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        counts={counts}
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
      <CustomLoading visible={refreshing} variant="circle" overlay position="top" />
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
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    borderColor: '#ffe399',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffe399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F131C',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 2,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 227, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffe399',
  },
  clearAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C90A1',
    textDecorationLine: 'underline',
  },
  resetFiltersBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    borderWidth: 1,
    borderColor: '#ffe399',
  },
  resetFiltersBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffe399',
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
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIconWrapper: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 4,
  },
  createOrderBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: '#FFE399',
  },
  createOrderBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F131C',
    letterSpacing: 0.2,
  },
});
