import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  View,
  Text,
  StatusBar,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { blink } from '@/lib/blink';
import { APP_CONFIG } from '@/lib/config';
import { CustomCard, useToast, CustomSkeleton } from '@/components/core';
import { useOrderChat, getSavedDisplayName } from '@/lib/chat';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  }
}

const TEST_DRIVERS = [
  { name: 'Marcus Johnson', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop' },
  { name: 'Sarah Kim', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop' },
  { name: 'David Torres', photo: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop' },
];

const CHANNEL_NAME = 'order-updates';

interface TrackedOrder {
  id: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  pickup_address?: string;
  pickupAddress?: string;
  delivery_address?: string;
  deliveryAddress?: string;
  items?: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered';
  created_at?: string;
  createdAt?: string;
  driver_name?: string;
  driverName?: string;
  driver_photo_url?: string;
  driverPhotoUrl?: string;
  tip_amount?: number;
  tipAmount?: number;
  distance_miles?: number;
  distanceMiles?: number;
  delivery_photo_url?: string;
  deliveryPhotoUrl?: string;
  payment_status?: string;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Just now';
  const timestamp = new Date(dateStr).getTime();
  if (isNaN(timestamp)) return 'Just now';

  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function CustomerOrderChat({ orderId, customerName }: { orderId: string; customerName: string }) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatName, setChatName] = useState<string | null>(null);

  useEffect(() => {
    getSavedDisplayName().then((n) => setChatName(n || customerName || 'Customer'));
  }, [customerName]);

  const { messages, isConnected, sendMessage } = useOrderChat({
    orderId,
    displayName: chatName || customerName || 'Customer',
    role: 'customer',
  });

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText('');
    setSending(true);
    try {
      await sendMessage(text);
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, sendMessage]);

  return (
    <View style={styles.chatCard}>
      <View style={styles.chatHeader}>
        <MaterialIcons name="chat" size={18} color="#FFE399" />
        <Text style={styles.chatHeaderTitle}>MESSAGE YOUR DRIVER</Text>
        <View style={{ flex: 1 }} />
        <View
          style={[
            styles.chatStatusDot,
            { backgroundColor: isConnected ? '#00E297' : '#8C90A1' },
          ]}
        />
      </View>

      {messages.length > 0 ? (
        <View style={styles.chatMessagesList}>
          {messages.slice(-4).map((msg) => {
            const isMine = msg.role === 'customer';
            return (
              <View
                key={msg.id}
                style={[
                  styles.chatBubbleRow,
                  { justifyContent: isMine ? 'flex-end' : 'flex-start' },
                ]}
              >
                <View
                  style={[
                    styles.chatBubble,
                    isMine ? styles.chatBubbleMine : styles.chatBubbleOther,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatBubbleText,
                      { color: isMine ? '#FFFFFF' : '#DFE2EF' },
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.chatEmptyText}>
          Send a quick note or instructions to your driver.
        </Text>
      )}

      <View style={styles.chatInputRow}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message to driver..."
          placeholderTextColor="#8C90A1"
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={Platform.OS === 'web' ? handleSend : undefined}
          style={styles.chatInputField}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          style={[
            styles.chatSendButton,
            { opacity: inputText.trim() && !sending ? 1 : 0.4 },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#0F131C" />
          ) : (
            <MaterialIcons name="send" size={16} color="#0F131C" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TrackOrderScreen() {
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const channelRef = useRef<any>(null);
  const [testBusy, setTestBusy] = useState(false);

  const fetchOrder = useCallback(
    async (showRefresh = false) => {
      if (!id) return;
      if (showRefresh) setRefreshing(true);

      // Check local cache first
      try {
        const raw = await AsyncStorage.getItem('customer_local_orders');
        if (raw) {
          const list: TrackedOrder[] = JSON.parse(raw);
          const found = list.find((o) => o.id === id);
          if (found) setOrder(found);
        }
      } catch { }

      try {
        const result = (await blink.db.orders.get(id)) as TrackedOrder;
        if (result) {
          setOrder(result);
        }
      } catch (err) {
        console.warn('[track] remote fetch failed:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  const handleAssignTestDriver = async () => {
    if (!id || !order) return;
    setTestBusy(true);
    haptic();
    try {
      const driver = TEST_DRIVERS[Math.floor(Math.random() * TEST_DRIVERS.length)];
      await blink.db.orders.update(id, {
        driver_name: driver.name,
        driver_photo_url: driver.photo,
        status: 'accepted',
      }).catch(() => { });

      const updated: TrackedOrder = {
        ...order,
        driver_name: driver.name,
        driverName: driver.name,
        driver_photo_url: driver.photo,
        driverPhotoUrl: driver.photo,
        status: 'accepted',
      };
      setOrder(updated);

      // Update local storage cache
      try {
        const raw = await AsyncStorage.getItem('customer_local_orders');
        if (raw) {
          const list: TrackedOrder[] = JSON.parse(raw);
          const idx = list.findIndex((o) => o.id === id);
          if (idx >= 0) {
            list[idx] = updated;
            await AsyncStorage.setItem('customer_local_orders', JSON.stringify(list));
          }
        }
      } catch { }

      showToast('Driver assigned!', {
        type: 'success',
        description: `${driver.name} is on the way to pick up your order.`,
      });
    } finally {
      setTestBusy(false);
    }
  };

  const handleTestDeliver = async () => {
    if (!id || !order) return;
    setTestBusy(true);
    haptic();
    try {
      await blink.db.orders.update(id, {
        status: 'delivered',
        delivery_photo_url:
          'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop',
      }).catch(() => { });

      const updated: TrackedOrder = {
        ...order,
        status: 'delivered',
        delivery_photo_url:
          'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop',
        deliveryPhotoUrl:
          'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop',
      };
      setOrder(updated);

      // Update local storage cache
      try {
        const raw = await AsyncStorage.getItem('customer_local_orders');
        if (raw) {
          const list: TrackedOrder[] = JSON.parse(raw);
          const idx = list.findIndex((o) => o.id === id);
          if (idx >= 0) {
            list[idx] = updated;
            await AsyncStorage.setItem('customer_local_orders', JSON.stringify(list));
          }
        }
      } catch { }

      showToast('Delivery completed!', {
        type: 'success',
        description: 'Package has been delivered to your address.',
      });
    } finally {
      setTestBusy(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Real-time subscription
  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const connect = async () => {
      try {
        const channel = blink.realtime.channel(CHANNEL_NAME);
        channelRef.current = channel;
        await channel.subscribe({ userId: `track-${id}` });
        if (!mounted) return;
        setIsConnected(true);
        channel.onMessage((msg: any) => {
          if (!mounted) return;
          if (msg.type === 'order-changed' || msg.type === 'order:status_change') {
            fetchOrder();
          }
        });
      } catch {
        if (mounted) setIsConnected(false);
      }
    };

    connect();
    return () => {
      mounted = false;
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch { }
      }
    };
  }, [id, fetchOrder]);

  const shortId = order?.id ? order.id.slice(-6).toUpperCase() : '------';
  const customerName = order?.customerName || order?.customer_name || 'Customer';
  const pickupAddress = order?.pickupAddress || order?.pickup_address || APP_CONFIG.STORE_ADDRESS || 'Store Pickup';
  const deliveryAddress = order?.deliveryAddress || order?.delivery_address || '—';
  const createdAt = order?.createdAt || order?.created_at;

  const currentStatus = order?.status || 'pending';
  const isDelivered = currentStatus === 'delivered';
  const isAccepted = currentStatus === 'accepted';
  const isPickedUp = currentStatus === 'picked_up';
  const isPending = currentStatus === 'pending';

  const driverName = order?.driverName || order?.driver_name;
  const driverPhoto = order?.driverPhotoUrl || order?.driver_photo_url;
  const deliveryPhoto = order?.deliveryPhotoUrl || order?.delivery_photo_url;

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.header}>
          <CustomSkeleton width={42} height={42} borderRadius={12} />
          <View style={{ alignItems: 'center', gap: 6 }}>
            <CustomSkeleton width={130} height={18} borderRadius={6} />
            <CustomSkeleton width={80} height={12} borderRadius={4} />
          </View>
          <CustomSkeleton width={42} height={42} borderRadius={12} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroCard, { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.06)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <CustomSkeleton width={48} height={48} circle />
              <View style={{ flex: 1, gap: 6 }}>
                <CustomSkeleton width={140} height={20} borderRadius={6} />
                <CustomSkeleton width="90%" height={12} borderRadius={4} />
              </View>
            </View>
          </View>

          <View style={[styles.card, { gap: 16, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.06)' }]}>
            <CustomSkeleton width={120} height={14} borderRadius={4} />
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <CustomSkeleton width={24} height={24} circle />
                <CustomSkeleton width="70%" height={14} borderRadius={4} />
              </View>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <CustomSkeleton width={24} height={24} circle />
                <CustomSkeleton width="85%" height={14} borderRadius={4} />
              </View>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <CustomSkeleton width={24} height={24} circle />
                <CustomSkeleton width="60%" height={14} borderRadius={4} />
              </View>
            </View>
          </View>

          <View style={[styles.card, { gap: 14, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.06)' }]}>
            <CustomSkeleton width={100} height={14} borderRadius={4} />
            <CustomSkeleton width="100%" height={40} borderRadius={10} />
            <CustomSkeleton width="100%" height={40} borderRadius={10} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <MaterialIcons name="error-outline" size={48} color="#F4C300" />
        <Text style={styles.notFoundTitle}>Order Not Found</Text>
        <Text style={styles.notFoundSubtitle}>
          We couldn't locate this order request.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(customer)/my-orders')}
          style={styles.primaryActionBtn}
        >
          <Text style={styles.primaryActionBtnText}>Back to My Orders</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getHeroTheme = () => {
    if (isDelivered) {
      return {
        icon: 'check-circle',
        title: 'Delivered ✓',
        desc: 'Your package has been successfully delivered.',
        color: '#00E297',
        bg: 'rgba(0, 226, 151, 0.08)',
        border: 'rgba(0, 226, 151, 0.3)',
        iconBg: 'rgba(0, 226, 151, 0.18)',
      };
    }
    if (isPickedUp) {
      return {
        icon: 'local-shipping',
        title: 'Out For Delivery',
        desc: 'Your driver has picked up the order and is heading to you.',
        color: '#F4C300',
        bg: 'rgba(244, 195, 0, 0.08)',
        border: 'rgba(244, 195, 0, 0.3)',
        iconBg: 'rgba(244, 195, 0, 0.18)',
      };
    }
    if (isAccepted || driverName) {
      return {
        icon: 'near-me',
        title: 'Driver On The Way',
        desc: `${driverName || 'A driver'} is heading to pick up your order.`,
        color: '#0066FF',
        bg: 'rgba(0, 102, 255, 0.08)',
        border: 'rgba(0, 102, 255, 0.3)',
        iconBg: 'rgba(0, 102, 255, 0.18)',
      };
    }
    return {
      icon: 'access-time',
      title: 'Order Placed',
      desc: 'Searching for an available driver in your area...',
      color: '#FFE399',
      bg: 'rgba(255, 227, 153, 0.06)',
      border: 'rgba(255, 227, 153, 0.25)',
      iconBg: 'rgba(255, 227, 153, 0.15)',
    };
  };

  const hero = getHeroTheme();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            haptic();
            router.replace('/(customer)/my-orders');
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
        >
          <MaterialIcons name="chevron-left" size={28} color="#DFE2EF" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Track Order</Text>
          <Text style={styles.headerOrderId}>#{shortId}</Text>
        </View>

        <View style={styles.liveBadge}>
          <View
            style={[
              styles.livePulseDot,
              { backgroundColor: isConnected ? '#00E297' : '#8C90A1' },
            ]}
          />
          <Text
            style={[
              styles.liveBadgeText,
              { color: isConnected ? '#00E297' : '#8C90A1' },
            ]}
          >
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrder(true)}
            tintColor="#FFE399"
          />
        }
      >
        <Animated.View entering={FadeInDown.springify()}>
          <View
            style={[
              styles.heroCard,
              { backgroundColor: hero.bg, borderColor: hero.border },
            ]}
          >
            <View style={[styles.heroIconBox, { backgroundColor: hero.iconBg }]}>
              <MaterialIcons name={hero.icon as any} size={36} color={hero.color} />
            </View>

            <View style={styles.heroTextCol}>
              <Text style={[styles.heroTitle, { color: hero.color }]}>
                {hero.title}
              </Text>
              <Text style={styles.heroDesc}>{hero.desc}</Text>
            </View>

            {isDelivered && deliveryPhoto && (
              <View style={styles.photoContainer}>
                <View style={styles.photoHeader}>
                  <MaterialIcons name="camera-alt" size={16} color="#00E297" />
                  <Text style={styles.photoHeaderText}>Delivery Photo by Driver</Text>
                </View>
                <Image
                  source={{ uri: deliveryPhoto }}
                  style={styles.deliveryImage}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(70).springify()}>
          <View style={styles.card}>
            <Text style={styles.cardHeaderLabel}>ORDER STATUS</Text>

            <View style={styles.timelineContainer}>
              <View style={styles.timelineStep}>
                <View style={[styles.stepDot, styles.stepDotDone]}>
                  <MaterialIcons name="check" size={16} color="#00E297" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Order Placed</Text>
                  <Text style={styles.stepSubtitle}>{timeAgo(createdAt)}</Text>
                </View>
              </View>

              <View
                style={[
                  styles.timelineConnector,
                  (isAccepted || isPickedUp || isDelivered || driverName) &&
                  styles.timelineConnectorActive,
                ]}
              />

              <View style={styles.timelineStep}>
                <View
                  style={[
                    styles.stepDot,
                    (isAccepted || isPickedUp || isDelivered || driverName)
                      ? styles.stepDotDone
                      : styles.stepDotPending,
                  ]}
                >
                  {(isAccepted || isPickedUp || isDelivered || driverName) ? (
                    <MaterialIcons name="check" size={16} color="#00E297" />
                  ) : (
                    <Text style={styles.stepNumber}>2</Text>
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepTitle,
                      !(isAccepted || isPickedUp || isDelivered || driverName) &&
                      styles.stepTitleInactive,
                    ]}
                  >
                    Driver Assigned
                  </Text>
                  <Text style={styles.stepSubtitle}>
                    {driverName ? `${driverName} is on the way` : 'Waiting for a driver...'}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.timelineConnector,
                  isDelivered && styles.timelineConnectorActive,
                ]}
              />

              <View style={styles.timelineStep}>
                <View
                  style={[
                    styles.stepDot,
                    isDelivered ? styles.stepDotDone : styles.stepDotPending,
                  ]}
                >
                  {isDelivered ? (
                    <MaterialIcons name="check" size={16} color="#00E297" />
                  ) : (
                    <Text style={styles.stepNumber}>3</Text>
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepTitle,
                      !isDelivered && styles.stepTitleInactive,
                    ]}
                  >
                    Delivered
                  </Text>
                  <Text style={styles.stepSubtitle}>
                    {isDelivered ? 'Order completed successfully!' : 'Will be delivered soon'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {driverName && (
          <Animated.View entering={FadeInDown.delay(130).springify()}>
            <View style={styles.card}>
              <Text style={styles.cardHeaderLabel}>ASSIGNED DRIVER</Text>
              <View style={styles.driverRow}>
                {driverPhoto ? (
                  <Image source={{ uri: driverPhoto }} style={styles.driverAvatarImg} />
                ) : (
                  <View style={styles.driverAvatarFallback}>
                    <MaterialIcons name="person" size={24} color="#FFE399" />
                  </View>
                )}

                <View style={styles.driverInfoCol}>
                  <Text style={styles.driverName}>{driverName}</Text>
                  <Text style={styles.driverRole}>
                    {isPickedUp ? 'Package picked up · En route' : 'Driver en route to store'}
                  </Text>
                </View>

                <View style={styles.enRoutePill}>
                  <Text style={styles.enRoutePillText}>EN ROUTE</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(180).springify()}>
          <View style={styles.card}>
            <Text style={styles.cardHeaderLabel}>ORDER DETAILS</Text>

            <View style={styles.detailItem}>
              <View style={[styles.detailIconBox, { borderColor: '#B3C5FF' }]}>
                <MaterialIcons name="inventory-2" size={14} color="#B3C5FF" />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={[styles.detailLabel, { color: '#B3C5FF' }]}>PICK UP FROM</Text>
                <Text style={styles.detailValue}>{pickupAddress}</Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailItem}>
              <View style={[styles.detailIconBox, { borderColor: '#00E297' }]}>
                <MaterialIcons name="location-on" size={14} color="#00E297" />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={[styles.detailLabel, { color: '#00E297' }]}>DELIVER TO</Text>
                <Text style={styles.detailValue}>{deliveryAddress}</Text>
              </View>
            </View>

            {order.items ? (
              <>
                <View style={styles.detailDivider} />
                <View style={styles.detailItem}>
                  <View style={[styles.detailIconBox, { borderColor: '#FFE399' }]}>
                    <Ionicons name="information-circle-outline" size={14} color="#FFE399" />
                  </View>
                  <View style={styles.detailTextCol}>
                    <Text style={[styles.detailLabel, { color: '#FFE399' }]}>PREFERENCES / ITEMS</Text>
                    <Text style={styles.detailValue}>{order.items}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </Animated.View>

        {driverName && !isDelivered && (
          <Animated.View entering={FadeInDown.delay(220).springify()}>
            <CustomerOrderChat orderId={id!} customerName={customerName} />
          </Animated.View>
        )}

        {!isDelivered && (
          <Animated.View entering={FadeInDown.delay(260).springify()}>
            <View style={styles.testControlsCard}>
              <View style={styles.testControlsHeader}>
                <MaterialIcons name="bolt" size={15} color="#FFE399" />
                <Text style={styles.testControlsTitle}>TEST SIMULATION CONTROLS</Text>
              </View>

              <View style={styles.testBtnRow}>
                <TouchableOpacity
                  onPress={handleAssignTestDriver}
                  disabled={testBusy || !!driverName}
                  style={[
                    styles.testBtn,
                    driverName ? styles.testBtnDisabled : styles.testBtnBlue,
                  ]}
                >
                  {testBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.testBtnBlueText}>
                      {driverName ? '✓ Driver Assigned' : 'Assign Test Driver'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleTestDeliver}
                  disabled={testBusy}
                  style={[styles.testBtn, styles.testBtnGreen]}
                >
                  <Text style={styles.testBtnGreenText}>Complete Delivery</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.footerButtons}>
          <TouchableOpacity
            onPress={() => {
              haptic();
              router.replace('/(customer)/my-orders');
            }}
            activeOpacity={0.85}
            style={styles.primaryBlueBtn}
          >
            <MaterialIcons name="list-alt" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBlueBtnText}>View All My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              haptic();
              router.replace('/(customer)');
            }}
            activeOpacity={0.85}
            style={styles.secondaryOutlineBtn}
          >
            <MaterialIcons name="add" size={20} color="#DFE2EF" />
            <Text style={styles.secondaryOutlineBtnText}>Request Another Pickup</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#8C90A1',
    fontWeight: '600',
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DFE2EF',
  },
  notFoundSubtitle: {
    fontSize: 14,
    color: '#8C90A1',
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryActionBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0066FF',
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 64 : 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DFE2EF',
  },
  headerOrderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C90A1',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.35)',
    paddingHorizontal: 10,
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
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 22,
    alignItems: 'center',
    gap: 14,
  },
  heroIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    alignItems: 'center',
    gap: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroDesc: {
    fontSize: 13.5,
    color: '#C2C6D8',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  photoContainer: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
    marginTop: 6,
    backgroundColor: '#10131B',
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
  },
  photoHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E297',
  },
  deliveryImage: {
    width: '100%',
    height: 220,
  },
  card: {
    backgroundColor: '#151821',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: '#151821',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    gap: 14,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C90A1',
    letterSpacing: 1,
  },
  timelineContainer: {
    gap: 0,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: 'rgba(0, 226, 151, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 226, 151, 0.4)',
  },
  stepDotPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8C90A1',
  },
  stepContent: {
    flex: 1,
    gap: 1,
  },
  stepTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#DFE2EF',
  },
  stepTitleInactive: {
    color: '#8C90A1',
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#8C90A1',
  },
  timelineConnector: {
    width: 2,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 15,
    marginVertical: 3,
  },
  timelineConnectorActive: {
    backgroundColor: '#00E297',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  driverAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 227, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfoCol: {
    flex: 1,
  },
  driverName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  driverRole: {
    fontSize: 12,
    color: '#00E297',
    marginTop: 1,
  },
  enRoutePill: {
    backgroundColor: 'rgba(0, 102, 255, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
  },
  enRoutePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  detailItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  detailIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10131B',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  detailTextCol: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 13.5,
    color: '#DFE2EF',
    lineHeight: 19,
    fontWeight: '500',
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chatCard: {
    backgroundColor: '#151821',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFE399',
    letterSpacing: 1,
  },
  chatStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  chatMessagesList: {
    gap: 8,
  },
  chatBubbleRow: {
    flexDirection: 'row',
  },
  chatBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chatBubbleMine: {
    backgroundColor: '#0066FF',
  },
  chatBubbleOther: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  chatBubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatEmptyText: {
    fontSize: 12.5,
    color: '#8C90A1',
    fontStyle: 'italic',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatInputField: {
    flex: 1,
    height: 42,
    backgroundColor: '#0F131C',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    color: '#DFE2EF',
    fontSize: 13.5,
  },
  chatSendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFE399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testControlsCard: {
    backgroundColor: 'rgba(0, 102, 255, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.25)',
    padding: 14,
    gap: 10,
  },
  testControlsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testControlsTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.8,
  },
  testBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  testBtnBlue: {
    backgroundColor: 'rgba(0, 102, 255, 0.15)',
    borderColor: 'rgba(0, 102, 255, 0.4)',
  },
  testBtnBlueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
  },
  testBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    opacity: 0.5,
  },
  testBtnGreen: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: 'rgba(0, 226, 151, 0.35)',
  },
  testBtnGreenText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E297',
  },
  footerButtons: {
    gap: 10,
    marginTop: 4,
  },
  primaryBlueBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0066FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(0, 102, 255, 0.35)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBlueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryOutlineBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryOutlineBtnText: {
    color: '#DFE2EF',
    fontSize: 14.5,
    fontWeight: '600',
  },
});