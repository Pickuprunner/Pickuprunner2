import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  FlatList,
  RefreshControl,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  View,
  Text,
  StatusBar,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
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
  Truck,
  ClipboardList,
  ArrowRight,
} from '@blinkdotnew/mobile-ui';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { blink } from '@/lib/blink';
import { APP_CONFIG } from '@/lib/config';
import { colors, gradients, spacing, borderRadius } from '@/constants/design';

const SESSION_KEY = 'customer_session_id';
const CHANNEL_NAME = 'order-updates';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  pickup_address?: string;
  delivery_address: string;
  items: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered';
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

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Just now';
  const timestamp = new Date(dateStr).getTime();
  if (isNaN(timestamp)) return 'Recently';

  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

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
  const isAccepted = item.status === 'accepted';
  const isPickedUp = item.status === 'picked_up';
  const isDelivered = item.status === 'delivered';

  const tip = Number(item.tip_amount ?? 0);
  const miles = Number(item.distance_miles ?? 0);
  const mileageCents = calcMileageCents(miles);
  const total = DELIVERY_FEE + mileageCents + tip;
  const hasMileageSurcharge = mileageCents > 0;
  const [expanded, setExpanded] = useState(false);

  const shortId = item.id ? item.id.slice(-6).toUpperCase() : '------';
  const initial = (item.customer_name?.trim() || 'C').charAt(0).toUpperCase();

  
  const getStatusBadge = () => {
    if (isPending) {
      return {
        label: 'PENDING',
        badgeStyle: styles.badgePending,
        textStyle: styles.badgeTextPending,
        icon: <Clock size={12} color={colors.secondaryContainer} />,
      };
    }
    if (isAccepted) {
      return {
        label: 'DRIVER ON THE WAY',
        badgeStyle: styles.badgeAccepted,
        textStyle: styles.badgeTextAccepted,
        icon: <Truck size={12} color={colors.primary} />,
      };
    }
    if (isPickedUp) {
      return {
        label: 'OUT FOR DELIVERY',
        badgeStyle: styles.badgePickedUp,
        textStyle: styles.badgeTextPickedUp,
        icon: <Navigation size={12} color={colors.secondaryContainer} />,
      };
    }
    return {
      label: 'DELIVERED',
      badgeStyle: styles.badgeDelivered,
      textStyle: styles.badgeTextDelivered,
      icon: <CheckCircle size={12} color={colors.tertiary} />,
    };
  };

  const statusBadge = getStatusBadge();

  
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isNewlyDelivered) {
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.4, { duration: 400 }),
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 500 })
      );
      glowScale.value = withSequence(
        withSpring(1.03, { damping: 8 }),
        withSpring(1, { damping: 12 })
      );
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
  }, [isNewlyDelivered]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    shadowOpacity: glowOpacity.value * 0.6,
    shadowColor: colors.tertiary,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  }));

  const pickupAddress = item.pickup_address || APP_CONFIG.STORE_ADDRESS || 'Store Pickup Location';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={[styles.cardWrapper, glowStyle]}
    >
      <View
        style={[
          styles.card,
          isNewlyDelivered && styles.cardNewlyDelivered,
          isAccepted && styles.cardAccepted,
          isPickedUp && styles.cardPickedUp,
        ]}
      >
        <LinearGradient
          colors={['#181C28', '#141722', '#0F121C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
         
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{initial}</Text>
              </View>
              <View style={styles.nameBlock}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {item.customer_name || 'Customer Order'}
                </Text>
                <Text style={styles.orderIdText}>Order #{shortId}</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <View style={[styles.statusBadge, statusBadge.badgeStyle]}>
                {statusBadge.icon}
                <Text style={[styles.statusBadgeText, statusBadge.textStyle]}>
                  {statusBadge.label}
                </Text>
              </View>
              <Text style={styles.timeAgoText}>{formatRelativeTime(item.created_at)}</Text>
            </View>
          </View>

         
          <View style={styles.routeContainer}>
            
            <View style={styles.routeRow}>
              <View style={styles.iconCircleBlue}>
                <Package size={14} color={colors.primary} />
              </View>
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>PICK UP FROM</Text>
                <Text style={styles.routeAddress} numberOfLines={2}>
                  {pickupAddress}
                </Text>
              </View>
            </View>

            
            <View style={styles.connectorLine} />

            
            <View style={styles.routeRow}>
              <View style={styles.iconCircleGreen}>
                <MapPin size={14} color={colors.tertiary} />
              </View>
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>DELIVER TO</Text>
                <Text style={styles.routeAddress} numberOfLines={2}>
                  {item.delivery_address}
                </Text>
              </View>
            </View>
          </View>

          
          {item.items ? (
            <View style={styles.itemsPill}>
              <Ionicons name="information-circle-outline" size={15} color={colors.outline} />
              <Text style={styles.itemsPillText} numberOfLines={2}>
                {item.items}
              </Text>
            </View>
          ) : null}

          
          {(item.driver_name || item.driver_photo_url) && !isDelivered && (
            <View style={styles.driverBanner}>
              <View style={styles.driverAvatar}>
                <User size={16} color={colors.tertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverNameText}>{item.driver_name || 'Driver Assigned'}</Text>
                <Text style={styles.driverStatusText}>
                  {isPickedUp ? 'Package picked up · On the way!' : 'Assigned · Heading to store'}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push(`/(customer)/track/${item.id}` as any)}
                style={styles.driverTrackBtn}
              >
                <Text style={styles.driverTrackBtnText}>Track</Text>
                <ArrowRight size={14} color={colors.tertiary} />
              </Pressable>
            </View>
          )}

          
          <Pressable
            onPress={() => {
              setExpanded((v) => !v);
              if (Platform.OS !== 'web') {
                Haptics.selectionAsync().catch(() => {});
              }
            }}
            style={styles.priceBar}
          >
            <View style={styles.priceBarLeft}>
              <Text style={styles.priceTotalValue}>{fmt(total)}</Text>
              <View style={styles.paymentStatusTag}>
                <DollarSign
                  size={11}
                  color={item.payment_status === 'paid' ? colors.tertiary : colors.secondaryContainer}
                />
                <Text
                  style={[
                    styles.paymentStatusText,
                    {
                      color:
                        item.payment_status === 'paid'
                          ? colors.tertiary
                          : colors.secondaryContainer,
                    },
                  ]}
                >
                  {item.payment_status === 'paid' ? 'Paid' : 'Pay on Pickup'}
                </Text>
              </View>
            </View>

            <View style={styles.priceBarRight}>
              <Text style={styles.breakdownToggleText}>
                {expanded ? 'Hide Breakdown' : 'View Details'}
              </Text>
              {expanded ? (
                <ChevronUp size={15} color={colors.outline} />
              ) : (
                <ChevronDown size={15} color={colors.outline} />
              )}
            </View>
          </Pressable>

          
          {expanded && (
            <View style={styles.breakdownDrawer}>
              <Text style={styles.breakdownHeader}>PRICE BREAKDOWN</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Base delivery fee</Text>
                <Text style={styles.breakdownValue}>{fmt(DELIVERY_FEE)}</Text>
              </View>
              {hasMileageSurcharge && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    Mileage ({(miles - MILEAGE_FREE_MILES).toFixed(1)} mi surcharge)
                  </Text>
                  <Text style={[styles.breakdownValue, { color: colors.secondaryContainer }]}>
                    {fmt(mileageCents)}
                  </Text>
                </View>
              )}
              {tip > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Driver tip</Text>
                  <Text style={[styles.breakdownValue, { color: colors.tertiary }]}>{fmt(tip)}</Text>
                </View>
              )}
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotalLabel}>Estimated Total</Text>
                <Text style={styles.breakdownTotalValue}>{fmt(total)}</Text>
              </View>
            </View>
          )}

         
          <View style={styles.actionRow}>
           
            {!isDelivered && (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }
                  router.push(`/(customer)/track/${item.id}` as any);
                }}
                style={({ pressed }) => [
                  styles.trackBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Navigation size={15} color="#0F131C" />
                <Text style={styles.trackBtnText}>Live Tracking</Text>
              </Pressable>
            )}

           
            <Pressable
              onPress={() => Linking.openURL(`mailto:${APP_CONFIG.STORE_EMAIL}`)}
              style={({ pressed }) => [styles.actionOutlineBtn, pressed && styles.btnPressed]}
            >
              <Mail size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.actionOutlineBtnText}>Support</Text>
            </Pressable>

           
            {isPending && (
              <Pressable
                onPress={() => onCancel(item.id)}
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
              >
                <Trash2 size={14} color="#FF6B6B" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            )}
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}


export default function MyOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newlyDeliveredIds, setNewlyDeliveredIds] = useState<Set<string>>(new Set());
  const prevStatusMap = useRef<Map<string, string>>(new Map());
  const channelRef = useRef<any>(null);

  const fetchOrders = useCallback(
    async (sid?: string) => {
      const id = sid || sessionId || (await AsyncStorage.getItem(SESSION_KEY));
      if (!id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve([]), 3500)
      );

      try {
        const authUser = await blink.auth.me().catch(() => null);
        const userEmail = authUser?.email;

        const fetchPromise = Promise.all([
          blink.db.orders
            .list({
              where: { customer_session_id: id },
              orderBy: { created_at: 'desc' },
            })
            .catch(() => []),
          userEmail
            ? blink.db.orders
                .list({
                  where: { customer_email: userEmail },
                  orderBy: { created_at: 'desc' },
                })
                .catch(() => [])
            : Promise.resolve([]),
        ]);

        const [sessionOrders, emailOrders] = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as [Order[], Order[]];

        
        const orderMap = new Map<string, Order>();
        (sessionOrders || []).forEach((o) => o?.id && orderMap.set(o.id, o));
        (emailOrders || []).forEach((o) => o?.id && orderMap.set(o.id, o));

        const result = Array.from(orderMap.values()).sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );

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
          setTimeout(() => setNewlyDeliveredIds(new Set()), 6000);
        }

        setOrders(result);
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
    let mounted = true;

    async function init() {
      try {
        const sid = await getOrCreateSessionId();
        if (!mounted) return;
        setSessionId(sid);
        await fetchOrders(sid);
      } catch (err) {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

 
  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;

    const connect = async () => {
      try {
        const channel = blink.realtime.channel(CHANNEL_NAME);
        channelRef.current = channel;
        channel.subscribe({ userId: 'customer-' + sessionId }).catch(() => {});
        if (!mounted) return;
        setIsConnected(true);

        channel.onMessage((msg: any) => {
          if (!mounted) return;
          if (msg.type !== 'order-changed') return;
          fetchOrders();
        });
      } catch {
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
  }, [sessionId, fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
  }, [fetchOrders]);

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
      Alert.alert('Cancel Pickup?', 'This will cancel and remove your pickup request.', [
        { text: 'Keep It', style: 'cancel' },
        { text: 'Cancel Pickup', style: 'destructive', onPress: doCancel },
      ]);
    }
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Order; index: number }) => (
      <OrderCard
        key={item.id}
        item={item}
        index={index}
        isNewlyDelivered={newlyDeliveredIds.has(item.id)}
        onCancel={handleCancel}
      />
    ),
    [newlyDeliveredIds, handleCancel]
  );

  const activeCount = orders.filter((o) => o.status !== 'delivered').length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      
      <LinearGradient
        colors={gradients.heroGlow}
        locations={gradients.heroGlowLocations}
        style={styles.heroGlow}
        pointerEvents="none"
      />

      
      <View style={styles.screenHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>My Orders</Text>
          <Text style={styles.screenSubtitle}>
            {activeCount > 0
              ? `${activeCount} active ${activeCount === 1 ? 'order' : 'orders'} · Live tracking`
              : 'View and track all your pickup requests'}
          </Text>
        </View>

       
        <View
          style={[
            styles.liveIndicatorPill,
            isConnected ? styles.liveIndicatorConnected : styles.liveIndicatorOffline,
          ]}
        >
          {isConnected ? (
            <View style={styles.livePulseDot} />
          ) : (
            <WifiOff size={11} color={colors.outline} />
          )}
          <Text
            style={[
              styles.liveIndicatorText,
              { color: isConnected ? colors.tertiary : colors.outline },
            ]}
          >
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

     
      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondaryContainer}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondaryContainer} />
              <Text style={styles.loadingText}>Loading your orders…</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <ClipboardList size={40} color={colors.secondaryContainer} />
              </View>
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptySubtitle}>
                Request your first pickup and track its live delivery status here in real time.
              </Text>
              <Pressable
                onPress={() => router.push('/(customer)' as any)}
                style={({ pressed }) => [styles.emptyCtaBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.emptyCtaText}>Request a Pickup</Text>
                <ArrowRight size={16} color="#0F131C" />
              </Pressable>
            </View>
          )
        }
      />
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    width: '100%',
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 14,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#8C90A1',
    marginTop: 2,
    fontWeight: '500',
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveIndicatorConnected: {
    backgroundColor: 'rgba(0, 226, 151, 0.10)',
    borderColor: 'rgba(0, 226, 151, 0.35)',
  },
  liveIndicatorOffline: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.tertiary,
  },
  liveIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
    gap: 14,
  },

  
  cardWrapper: {
    marginVertical: 2,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  cardNewlyDelivered: {
    borderColor: colors.tertiary,
  },
  cardAccepted: {
    borderColor: 'rgba(0, 102, 255, 0.35)',
  },
  cardPickedUp: {
    borderColor: 'rgba(244, 195, 0, 0.35)',
  },
  cardGradient: {
    padding: 16,
    gap: 14,
  },

  
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#242838',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DFE2EF',
  },
  nameBlock: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C90A1',
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgePending: {
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    borderColor: 'rgba(244, 195, 0, 0.35)',
  },
  badgeTextPending: {
    color: colors.secondaryContainer,
  },
  badgeAccepted: {
    backgroundColor: 'rgba(0, 102, 255, 0.15)',
    borderColor: 'rgba(0, 102, 255, 0.35)',
  },
  badgeTextAccepted: {
    color: colors.primary,
  },
  badgePickedUp: {
    backgroundColor: 'rgba(244, 195, 0, 0.15)',
    borderColor: 'rgba(244, 195, 0, 0.35)',
  },
  badgeTextPickedUp: {
    color: colors.secondaryContainer,
  },
  badgeDelivered: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: 'rgba(0, 226, 151, 0.35)',
  },
  badgeTextDelivered: {
    color: colors.tertiary,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeAgoText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },

  
  routeContainer: {
    backgroundColor: '#12151E',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconCircleBlue: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 102, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconCircleGreen: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 226, 151, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  connectorLine: {
    width: 2,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginLeft: 11,
    marginVertical: 2,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 0.8,
  },
  routeAddress: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#DFE2EF',
    marginTop: 1,
    lineHeight: 18,
  },

  
  itemsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  itemsPillText: {
    fontSize: 12.5,
    color: '#C2C6D8',
    flex: 1,
  },

  
  driverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.25)',
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 226, 151, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  driverStatusText: {
    fontSize: 11.5,
    color: colors.tertiary,
  },
  driverTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  driverTrackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.tertiary,
  },

  
  priceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#12151E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  priceBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.secondaryContainer,
  },
  paymentStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priceBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breakdownToggleText: {
    fontSize: 12,
    color: '#8C90A1',
    fontWeight: '600',
  },

  
  breakdownDrawer: {
    backgroundColor: '#10131B',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  breakdownHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 1,
    marginBottom: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12.5,
    color: '#C2C6D8',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 2,
  },
  breakdownTotalLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breakdownTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.secondaryContainer,
  },

  
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  trackBtn: {
    flex: 2,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.secondaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  trackBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F131C',
  },
  actionOutlineBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  actionOutlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C2C6D8',
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8B8B',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
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
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 14,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 195, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#8C90A1',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCtaBtn: {
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 8,
    shadowColor: colors.secondaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyCtaText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F131C',
  },
});
