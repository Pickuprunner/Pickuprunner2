import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FlatList, RefreshControl, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  AppHeader,
  Card,
  Badge,
  Avatar,
  EmptyState,
  ClipboardList,
  MapPin,
  Package,
  Trash2,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Navigation,
  DollarSign,
  Wifi,
  WifiOff,
  Phone,
  Mail,
  User,
} from '@blinkdotnew/mobile-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { blink } from '@/lib/blink';
import { APP_CONFIG } from '@/lib/config';
import { Linking } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/design';

const SESSION_KEY = 'customer_session_id';
const CHANNEL_NAME = 'order-updates';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: string;
  status: 'pending' | 'delivered';
  created_at: string;
  customer_session_id?: string;
  tip_amount?: number;
  payment_status?: string;
  distance_miles?: number;
  driver_name?: string;
  driver_photo_url?: string;
}

const DELIVERY_FEE = APP_CONFIG.DELIVERY_FEE_CENTS;
const MILEAGE_FREE_MILES = APP_CONFIG.FREE_MILES;
const MILEAGE_RATE_CENTS = APP_CONFIG.MILEAGE_RATE_CENTS;

function calcMileageCents(miles?: number): number {
  const m = Number(miles ?? 0);
  if (!m || m <= MILEAGE_FREE_MILES) return 0;
  return Math.round((m - MILEAGE_FREE_MILES) * MILEAGE_RATE_CENTS);
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Animated order card ──────────────────────────────────────────────────────

function OrderCard({
  item,
  index,
  isNewlyDelivered,
  onCancel,
}: {
  item: Order;
  index: number;
  isNewlyDelivered: boolean;
  onCancel: (id: string) => void;
}) {
  const isPending = item.status === 'pending';
  const tip = Number(item.tip_amount ?? 0);
  const miles = Number(item.distance_miles ?? 0);
  const mileageCents = calcMileageCents(miles);
  const total = DELIVERY_FEE + mileageCents + tip;
  const hasMileageSurcharge = mileageCents > 0;
  const [expanded, setExpanded] = useState(false);

  // Pulse animation for newly-delivered orders
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isNewlyDelivered) {
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.4, { duration: 400 }),
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 500 }),
      );
      glowScale.value = withSequence(
        withSpring(1.03, { damping: 8 }),
        withSpring(1, { damping: 12 }),
      );
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
  }, [isNewlyDelivered]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    shadowOpacity: glowOpacity.value * 0.6,
    shadowColor: '#22c55e',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={glowStyle}>
      <Card
        marginVertical="$2"
        padding="$4"
        borderRadius="$4"
        backgroundColor={isNewlyDelivered ? '$green2' : '$color2'}
        borderWidth={isNewlyDelivered ? 2 : 1}
        borderColor={isNewlyDelivered ? '$green6' : isPending ? '$amber4' : '$color4'}
        elevation={2}
      >
        <YStack gap="$3">
          {/* Status + time */}
          <XStack justifyContent="space-between" alignItems="center">
            <XStack gap="$2" alignItems="center">
              {isPending
                ? <Clock size={14} color="$amber9" />
                : <CheckCircle size={14} color="$green9" />}
              <Badge variant={isPending ? 'warning' : 'success'}>
                {isPending ? 'PENDING' : 'DELIVERED'}
              </Badge>
              {isNewlyDelivered && (
                <SizableText size="$2" color="$green9" fontWeight="700">🎉 Just delivered!</SizableText>
              )}
            </XStack>
            <SizableText size="$2" color="$color9">{timeAgo(item.created_at)}</SizableText>
          </XStack>

          {/* Order ID + name */}
          <YStack gap="$1">
            <SizableText size="$5" fontWeight="700" color="$color12">{item.customer_name}</SizableText>
            <SizableText size="$2" color="$color9">Order #{item?.id ? item.id.slice(-6).toUpperCase() : '------'}</SizableText>
          </YStack>

          {/* Address + items */}
          <YStack gap="$2">
            <XStack gap="$2" alignItems="flex-start">
              <MapPin size={13} color="$color9" style={{ marginTop: 2 }} />
              <SizableText size="$3" color="$color11" flex={1} numberOfLines={2}>
                {item.delivery_address}
              </SizableText>
            </XStack>
            <XStack gap="$2" alignItems="flex-start">
              <Package size={13} color="$color9" style={{ marginTop: 2 }} />
              <SizableText size="$3" color="$color11" flex={1} numberOfLines={2}>
                {item.items}
              </SizableText>
            </XStack>
            {miles > 0 && (
              <XStack gap="$2" alignItems="center">
                <Navigation size={13} color="$color9" />
                <SizableText size="$3" color="$color11">
                  {miles.toFixed(1)} mi
                  {hasMileageSurcharge ? ` · ${(miles - MILEAGE_FREE_MILES).toFixed(1)} mi over limit` : ' · within free zone'}
                </SizableText>
              </XStack>
            )}
          </YStack>

          {/* Payment badge + expand toggle */}
          <Pressable onPress={() => setExpanded((v) => !v)}>
            <XStack
              justifyContent="space-between"
              alignItems="center"
              backgroundColor={item.payment_status === 'paid' ? '$green2' : '$amber2'}
              borderRadius={8}
              padding="$2"
              paddingHorizontal="$3"
            >
              <XStack gap="$2" alignItems="center">
                <DollarSign size={13} color={item.payment_status === 'paid' ? '$green9' : '$amber9'} />
                <SizableText
                  size="$2"
                  color={item.payment_status === 'paid' ? '$green10' : '$amber10'}
                  fontWeight="600"
                >
                  {item.payment_status === 'paid' ? '✓ Paid' : 'Pay on Pickup'}
                </SizableText>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <SizableText size="$3" fontWeight="800" color={item.payment_status === 'paid' ? '$green10' : '$amber10'}>
                  {fmt(total)}
                </SizableText>
                {expanded
                  ? <ChevronUp size={14} color="$color9" />
                  : <ChevronDown size={14} color="$color9" />}
              </XStack>
            </XStack>
          </Pressable>

          {/* Expandable cost breakdown */}
          {expanded && (
            <YStack
              backgroundColor="$color3"
              borderRadius={10}
              padding="$3"
              gap="$2"
              borderWidth={1}
              borderColor="$color5"
            >
              <SizableText size="$2" fontWeight="700" color="$color10">COST BREAKDOWN</SizableText>
              <XStack justifyContent="space-between">
                <SizableText size="$2" color="$color11">Delivery fee (incl. first 5 mi)</SizableText>
                <SizableText size="$2" color="$color12" fontWeight="600">{fmt(DELIVERY_FEE)}</SizableText>
              </XStack>
              {hasMileageSurcharge && (
                <XStack justifyContent="space-between">
                  <SizableText size="$2" color="$color11">
                    Mileage ({(miles - MILEAGE_FREE_MILES).toFixed(1)} mi × $2.00)
                  </SizableText>
                  <SizableText size="$2" color="$amber10" fontWeight="600">{fmt(mileageCents)}</SizableText>
                </XStack>
              )}
              <XStack justifyContent="space-between">
                <SizableText size="$2" color="$color11">Driver tip</SizableText>
                <SizableText size="$2" color="$green10" fontWeight="600">{fmt(tip)}</SizableText>
              </XStack>
              <YStack height={1} backgroundColor="$color5" />
              <XStack justifyContent="space-between">
                <SizableText size="$3" fontWeight="700" color="$color12">Total due on pickup</SizableText>
                <SizableText size="$3" fontWeight="800" color="$color12">{fmt(total)}</SizableText>
              </XStack>
            </YStack>
          )}

          {/* Driver info card — shown when a driver is assigned and order is in progress */}
          {isPending && (item.driver_name || item.driver_photo_url) && (
            <XStack
              backgroundColor="rgba(22,163,74,0.08)"
              borderRadius={10}
              borderWidth={1}
              borderColor="rgba(22,163,74,0.25)"
              padding="$3"
              gap="$3"
              alignItems="center"
            >
              <Avatar size="$3" borderRadius="$full" backgroundColor="rgba(22,163,74,0.18)">
                {item.driver_photo_url ? (
                  <Avatar.Image source={{ uri: item.driver_photo_url }} />
                ) : (
                  <User size={18} color="$green9" />
                )}
              </Avatar>
              <YStack flex={1}>
                {item.driver_name ? (
                  <SizableText size="$3" fontWeight="700" color="$green10">
                    {item.driver_name}
                  </SizableText>
                ) : null}
                <SizableText size="$2" color="$green9">
                  Your driver is on the way!
                </SizableText>
              </YStack>
            </XStack>
          )}

          {/* Action buttons for pending orders */}
          {isPending && (
            <XStack gap="$2">
              {/* Call store for questions */}
              <Pressable
                onPress={() => Linking.openURL(`mailto:${APP_CONFIG.STORE_EMAIL}`)}
                style={({ pressed }) => [styles.callBtn, pressed && styles.cancelBtnPressed]}
              >
                <XStack gap="$1" alignItems="center" justifyContent="center">
                  <Mail size={13} color="$color10" />
                  <SizableText size="$2" fontWeight="600" color="$color10">Email Us</SizableText>
                </XStack>
              </Pressable>

              {/* Cancel */}
              <Pressable
                onPress={() => onCancel(item.id)}
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
              >
                <XStack gap="$1" alignItems="center" justifyContent="center">
                  <Trash2 size={13} color="$red9" />
                  <SizableText size="$2" fontWeight="600" color="$red9">Cancel</SizableText>
                </XStack>
              </Pressable>
            </XStack>
          )}
        </YStack>
      </Card>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MyOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newlyDeliveredIds, setNewlyDeliveredIds] = useState<Set<string>>(new Set());
  const prevStatusMap = useRef<Map<string, string>>(new Map());
  const channelRef = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY).then((id) => setSessionId(id));
  }, []);

  const fetchOrders = useCallback(async (sid?: string) => {
    const id = sid ?? sessionId;
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const result = await blink.db.orders.list({
        where: { customer_session_id: id },
        orderBy: { created_at: 'desc' },
      }) as Order[];

      // Detect newly delivered orders vs previous state
      const newly = new Set<string>();
      result.forEach((o) => {
        const prev = prevStatusMap.current.get(o.id);
        if (prev === 'pending' && o.status === 'delivered') {
          newly.add(o.id);
        }
        prevStatusMap.current.set(o.id, o.status);
      });

      if (newly.size > 0) {
        setNewlyDeliveredIds(newly);
        // Clear highlight after 6 seconds
        setTimeout(() => setNewlyDeliveredIds(new Set()), 6000);
      }

      setOrders(result);
    } catch (err) {
      console.warn('[my-orders] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial fetch
  useEffect(() => {
    if (sessionId !== null) fetchOrders(sessionId);
  }, [sessionId]);

  // Real-time subscription — listen for driver status updates
  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;

    const connect = async () => {
      try {
        const channel = blink.realtime.channel(CHANNEL_NAME);
        channelRef.current = channel;
        await channel.subscribe({ userId: 'customer-' + sessionId });
        if (!mounted) return;
        setIsConnected(true);

        channel.onMessage((msg: any) => {
          if (!mounted) return;
          if (msg.type !== 'order-changed') return;
          // Refresh our orders on any change
          fetchOrders();
        });
      } catch (err) {
        console.warn('[my-orders] realtime failed, degrading to manual refresh');
        if (mounted) setIsConnected(false);
      }
    };

    connect();

    return () => {
      mounted = false;
      channelRef.current?.unsubscribe().catch(() => {});
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId]);

  const handleCancel = useCallback(async (id: string) => {
    const doCancel = async () => {
      try {
        await blink.db.orders.delete(id);
        setOrders((prev) => prev.filter((o) => o.id !== id));
        prevStatusMap.current.delete(id);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      } catch (err) {
        console.warn('[my-orders] cancel failed:', err);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Cancel this pickup request?')) doCancel();
    } else {
      Alert.alert('Cancel Pickup?', 'This will remove your pickup request.', [
        { text: 'Keep It', style: 'cancel' },
        { text: 'Cancel Pickup', style: 'destructive', onPress: doCancel },
      ]);
    }
  }, []);

  const renderItem = useCallback(({ item, index }: { item: Order; index: number }) => (
    <OrderCard
      key={item.id}
      item={item}
      index={index}
      isNewlyDelivered={newlyDeliveredIds.has(item.id)}
      onCancel={handleCancel}
    />
  ), [newlyDeliveredIds, handleCancel]);

  return (
    <SafeArea>
      {/* Header with live indicator */}
      <XStack
        paddingHorizontal="$4"
        paddingTop="$2"
        paddingBottom="$1"
        justifyContent="space-between"
        alignItems="center"
      >
        <SizableText size="$6" fontWeight="800" color="$color12">My Orders</SizableText>
        <XStack
          gap="$1"
          alignItems="center"
          paddingHorizontal="$3"
          paddingVertical="$1"
          borderRadius="$full"
          backgroundColor={isConnected ? '$green3' : '$color3'}
          borderWidth={1}
          borderColor={isConnected ? '$green6' : '$color6'}
        >
          {isConnected
            ? <Wifi size={12} color="$green9" />
            : <WifiOff size={12} color="$color9" />}
          <SizableText size="$1" fontWeight="700" color={isConnected ? '$green9' : '$color10'}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </SizableText>
        </XStack>
      </XStack>

      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchOrders()}
            tintColor="#22c55e"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <YStack alignItems="center" paddingTop="$10">
              <EmptyState
                icon={<ClipboardList size={56} color="$color8" />}
                title="No orders yet"
                description="Request a pickup and it will appear here."
              />
            </YStack>
          ) : null
        }
      />
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#7f1d1d40',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    backgroundColor: '#7f1d1d10',
  },
  callBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  cancelBtnPressed: { opacity: 0.7 },
});
