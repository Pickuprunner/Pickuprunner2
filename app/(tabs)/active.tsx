/**
 * My Active Orders — driver's accepted/in-progress orders.
 * Clean card layout: status banner → addresses → single big action button.
 */
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Platform,
  StyleSheet,
  View,
  Text,
  Pressable,
  Linking,
} from 'react-native';
import {
  YStack,
  SizableText,
  Button,
  SafeArea,
  Spinner,
  Truck,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useOrders, useUpdateOrderStatus, Order } from '@/lib/orders';
import { useOrdersRealtime } from '@/lib/realtime';
import { useDriverId } from '@/hooks/useDriverId';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { calcDriverEarnings } from '@/lib/config';

const BLUE   = '#0066FF';
const YELLOW = '#F5C400';
const GREEN  = '#22C55E';
const ORANGE = '#F97316';
const BG     = '#0A0A0F';
const CARD   = '#111827';

function haptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

function openNav(address: string) {
  if (!address) return;
  const encoded = encodeURIComponent(address);
  const url = Platform.OS === 'ios'
    ? `maps://?daddr=${encoded}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  Linking.openURL(url);
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ── Order Card ────────────────────────────────────────────────────────────────

function ActiveOrderCard({ order }: { order: Order }) {
  const updateStatus = useUpdateOrderStatus();
  const { status } = order;
  const shortId = order.id ? order.id.slice(-6).toUpperCase() : '------';
  const miles = Number(order.distanceMiles ?? 0);
  const earnings = calcDriverEarnings(miles, Number(order.tipAmount ?? 0));
  const isMeetCustomer = !!(order.items?.includes('[MEET CUSTOMER]'));
  const isPending = updateStatus.isPending;

  // Which address is "next" for this driver
  const nextAddress = status === 'accepted' ? order.pickupAddress : order.deliveryAddress;

  // Status config
  const cfg =
    status === 'accepted'  ? { color: BLUE,   bg: 'rgba(0,102,255,0.15)',  label: 'STEP 1 — HEAD TO PICKUP' } :
    status === 'picked_up' ? { color: ORANGE, bg: 'rgba(249,115,22,0.15)', label: 'STEP 2 — DELIVER NOW'    } :
                             { color: GREEN,  bg: 'rgba(34,197,94,0.15)',  label: 'DELIVERED ✓'              };

  const handleAction = () => {
    if (status === 'accepted') {
      haptic();
      updateStatus.mutate({ id: order.id, status: 'picked_up' });
    } else if (status === 'picked_up') {
      if (!isMeetCustomer) {
        setSelectedOrder(order);
        router.push(`/order/${order.id}`);
      } else {
        // Always use the delivery detail flow so a photo is captured and the
        // customer receives the delivery MMS before the order is completed.
        setSelectedOrder(order);
        router.push(`/order/${order.id}`);
      }
    }
  };

  return (
    <View style={styles.card}>

      {/* ── Status banner ── */}
      <View style={[styles.statusBanner, { backgroundColor: cfg.bg, borderBottomColor: cfg.color + '40' }]}>
        <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
        <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={styles.timeAgo}>{relativeTime(order.createdAt)}</Text>
      </View>

      <View style={styles.cardBody}>

        {/* ── Customer name + order ID ── */}
        <View style={styles.nameRow}>
          <Text style={styles.customerName} numberOfLines={1}>{order.customerName}</Text>
          <Text style={styles.orderId}>#{shortId}</Text>
        </View>

        {/* ── Phone (tap to call) ── */}
        {!!order.customerPhone && (
          <Pressable
            onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
            style={styles.phoneRow}
            hitSlop={8}
          >
            <Text style={styles.phoneIcon}>📞</Text>
            <Text style={styles.phoneText}>{order.customerPhone}</Text>
          </Pressable>
        )}

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Pickup address ── */}
        <View style={styles.addrSection}>
          <Text style={styles.addrLabelText}>
            <Text style={{ color: YELLOW }}>▲ </Text>PICK UP FROM
          </Text>
          <Text style={styles.addrValue}>{order.pickupAddress || '—'}</Text>
          <Pressable
            onPress={() => { haptic(); openNav(order.pickupAddress ?? ''); }}
            style={({ pressed }) => [styles.mapBtn, { borderColor: YELLOW + '60' }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.mapBtnText, { color: YELLOW }]}>🗺  Open in Maps</Text>
          </Pressable>
        </View>

        {/* ── Delivery address ── */}
        <View style={[styles.addrSection, { marginTop: 12 }]}>
          <Text style={styles.addrLabelText}>
            <Text style={{ color: BLUE }}>▼ </Text>DELIVER TO
          </Text>
          <Text style={styles.addrValue}>{order.deliveryAddress || '—'}</Text>
          <Pressable
            onPress={() => { haptic(); openNav(order.deliveryAddress ?? ''); }}
            style={({ pressed }) => [styles.mapBtn, { borderColor: BLUE + '60' }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.mapBtnText, { color: BLUE }]}>🗺  Open in Maps</Text>
          </Pressable>
        </View>

        {/* ── Earnings ── */}
        {(earnings.tipCents > 0 || earnings.mileageCents > 0) && (
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>YOUR EARNINGS</Text>
            <Text style={styles.earningsAmt}>${(earnings.totalCents / 100).toFixed(2)}</Text>
            <Text style={styles.earningsBreak}>
              {[
                earnings.tipCents > 0 ? `$${(earnings.tipCents / 100).toFixed(2)} tip` : '',
                earnings.mileageCents > 0 ? `${miles.toFixed(1)} mi` : '',
              ].filter(Boolean).join('  ·  ')}
            </Text>
          </View>
        )}

        {/* ── Delivery type note ── */}
        <View style={styles.deliveryTypeRow}>
          <Text style={styles.deliveryTypeText}>
            {isMeetCustomer ? '🤝  Meet customer at door' : '🚪  Leave at door (photo required)'}
          </Text>
        </View>

        {/* ── Main action button ── */}
        {status !== 'delivered' && (
          <Pressable
            onPress={handleAction}
            disabled={isPending}
            style={({ pressed }) => [
              styles.actionBtn,
              status === 'accepted'  && styles.actionBtnPickup,
              status === 'picked_up' && styles.actionBtnDeliver,
              (pressed || isPending) && styles.actionBtnPressed,
            ]}
          >
            {isPending ? (
              <Spinner size="small" color="#000" />
            ) : (
              <Text style={styles.actionBtnText}>
                {status === 'accepted'  ? '✅  Order Picked Up'  : '🎯  Mark as Delivered'}
              </Text>
            )}
          </Pressable>
        )}

        {status === 'delivered' && (
          <View style={styles.deliveredBadge}>
            <Text style={styles.deliveredBadgeText}>✓  Delivered</Text>
          </View>
        )}

      </View>
    </View>
  );
}

// ── Tab badge (exported for _layout) ─────────────────────────────────────────

export function ActiveTabIcon({ color, size, count }: { color: string; size: number; count: number }) {
  return (
    <View>
      <Truck color={color} size={size} />
      {count > 0 && (
        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ActiveOrdersScreen() {
  const { data: orders = [], isLoading, refetch } = useOrders();
  const { isConnected } = useOrdersRealtime();
  const driverId = useDriverId();
  const [refreshing, setRefreshing] = useState(false);

  const activeOrders = orders
    .filter((o) => o.driverUserId === driverId && (o.status === 'accepted' || o.status === 'picked_up'))
    .sort((a, b) => Number(a.distanceMiles ?? 0) - Number(b.distanceMiles ?? 0));

  const allCards = activeOrders;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <SafeArea backgroundColor={BG} flex={1}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Orders</Text>
            <Text style={styles.headerSub}>
              {activeOrders.length > 0
                ? `${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''}`
                : 'No active orders'}
            </Text>
          </View>
          <View style={[styles.liveChip, isConnected ? styles.liveOn : styles.liveOff]}>
            <Text style={[styles.liveText, isConnected ? styles.liveTextOn : styles.liveTextOff]}>
              {isConnected ? '● LIVE' : '○ OFFLINE'}
            </Text>
          </View>
        </View>

        <FlatList
          data={allCards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ActiveOrderCard order={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} colors={[BLUE]} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !isLoading ? (
              <YStack alignItems="center" justifyContent="center" paddingVertical="$12" paddingHorizontal="$6">
                <Truck size={56} color="rgba(255,255,255,0.1)" />
                <SizableText size="$5" fontWeight="800" color="rgba(255,255,255,0.5)" marginTop="$5" textAlign="center">
                  No active orders
                </SizableText>
                <SizableText size="$3" color="rgba(255,255,255,0.3)" marginTop="$2" textAlign="center">
                  Accept orders from the Orders tab to see them here.
                </SizableText>
                <Button
                  marginTop="$5"
                  onPress={() => router.push('/(tabs)')}
                  backgroundColor={BLUE} color="white" size="$4"
                >
                  Browse Orders
                </Button>
              </YStack>
            ) : (
              <YStack alignItems="center" paddingVertical="$8">
                <Spinner size="large" color={BLUE} />
              </YStack>
            )
          }
        />
      </SafeArea>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: { color: 'white', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  headerSub:   { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2 },

  liveChip:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  liveOn:      { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.4)' },
  liveOff:     { backgroundColor: 'rgba(100,100,100,0.15)', borderColor: 'rgba(100,100,100,0.3)' },
  liveText:    { fontSize: 10, fontWeight: '800' },
  liveTextOn:  { color: GREEN },
  liveTextOff: { color: '#888' },

  list: { padding: 16, paddingBottom: 40, flexGrow: 1 },

  // Card
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardDone: { opacity: 0.6 },

  // Status banner across the top of each card
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  timeAgo:     { color: 'rgba(255,255,255,0.35)', fontSize: 11 },

  cardBody: { padding: 16 },

  // Name + ID
  nameRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  customerName: { color: 'white', fontSize: 20, fontWeight: '800', flex: 1, marginRight: 8 },
  orderId:      { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'monospace' },

  // Phone
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  phoneIcon: { fontSize: 14 },
  phoneText: { color: '#60A5FA', fontSize: 14, fontWeight: '600' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 14 },

  // Address sections
  addrSection:   {},
  addrLabelText: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  addrValue:     { color: 'white', fontSize: 15, lineHeight: 22, fontWeight: '500', marginBottom: 8 },
  mapBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  mapBtnText: { fontSize: 13, fontWeight: '700' },

  // Earnings
  earningsRow: {
    marginTop: 14,
    backgroundColor: 'rgba(245,196,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,196,0,0.2)',
    borderRadius: 10,
    padding: 12,
  },
  earningsLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  earningsAmt:   { color: YELLOW, fontSize: 22, fontWeight: '900' },
  earningsBreak: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },

  // Delivery type note
  deliveryTypeRow: { marginTop: 10, marginBottom: 4 },
  deliveryTypeText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },

  // Main action button
  actionBtn: {
    marginTop: 16,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPickup:  { backgroundColor: ORANGE },
  actionBtnDeliver: { backgroundColor: GREEN },
  actionBtnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  actionBtnText: { color: '#000', fontSize: 17, fontWeight: '900' },

  deliveredBadge: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  deliveredBadgeText: { color: GREEN, fontSize: 15, fontWeight: '700' },

  // Tab badge
  tabBadge: {
    position: 'absolute', top: -4, right: -6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: { fontSize: 9, fontWeight: '800', color: '#000' },
});
