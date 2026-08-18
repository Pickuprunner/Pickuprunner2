import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Platform, Pressable, RefreshControl, ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, FlatList, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown, useSharedValue, withSpring } from 'react-native-reanimated';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  Avatar,
  Card,
  Spinner,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  User,
  ChevronLeft,
  RefreshCw,
  MessageCircle,
  Send,
} from '@blinkdotnew/mobile-ui';
import { blink } from '@/lib/blink';
import { APP_CONFIG } from '@/lib/config';
import { colors, spacing, borderRadius } from '@/constants/design';
import { useOrderChat, getSavedDisplayName, saveDisplayName, ChatMessage } from '@/lib/chat';

const TEST_DRIVERS = [
  { name: 'Marcus Johnson', photo: 'https://i.pravatar.cc/150?u=marcus' },
  { name: 'Sarah Kim', photo: 'https://i.pravatar.cc/150?u=sarah' },
  { name: 'David Torres', photo: 'https://i.pravatar.cc/150?u=david' },
];

const CHANNEL_NAME = 'order-updates';

interface TrackedOrder {
  id: string;
  customer_name: string;
  delivery_address: string;
  items: string;
  status: 'pending' | 'delivered';
  created_at: string;
  driverName?: string;
  driverPhotoUrl?: string;
  tip_amount?: number;
  distance_miles?: number;
  delivery_photo_url?: string;
  deliveryPhotoUrl?: string;
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

function CustomerOrderChat({ orderId, customerName }: { orderId: string; customerName: string }) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatName, setChatName] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

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
    try { await sendMessage(text); } catch { setInputText(text); } finally { setSending(false); }
  }, [inputText, sending, sendMessage]);

  return (
    <Card borderRadius="$4" backgroundColor="$color2" borderWidth={1} borderColor="$color4" overflow="hidden">
      {/* Header */}
      <XStack paddingHorizontal="$4" paddingTop="$3" paddingBottom="$2" alignItems="center" space="$2">
        <MessageCircle size={16} color="$color9" />
        <SizableText size="$3" fontWeight="700" color="$color10">MESSAGE YOUR DRIVER</SizableText>
        <YStack flex={1} />
        <YStack width={6} height={6} borderRadius={3} backgroundColor={isConnected ? '$green9' : '$color7'} />
      </XStack>

      {/* Messages (last 5) */}
      {messages.length > 0 && (
        <YStack paddingHorizontal="$4" paddingBottom="$2" maxHeight={160}>
          {messages.slice(-5).map((msg) => {
            const isMine = msg.role === 'customer';
            return (
              <YStack key={msg.id} marginBottom="$1" alignItems={isMine ? 'flex-end' : 'flex-start'}>
                <YStack
                  backgroundColor={isMine ? '#2D6A4F' : '$color4'}
                  borderRadius={12}
                  borderBottomRightRadius={isMine ? 4 : 12}
                  borderBottomLeftRadius={isMine ? 12 : 4}
                  paddingHorizontal="$3"
                  paddingVertical="$1.5"
                  maxWidth="80%"
                >
                  <SizableText size="$2" color={isMine ? 'white' : '$color12'}>{msg.text}</SizableText>
                </YStack>
              </YStack>
            );
          })}
        </YStack>
      )}

      {messages.length === 0 && (
        <YStack paddingHorizontal="$4" paddingBottom="$2">
          <SizableText size="$2" color="$color9">Send a message to your driver about this delivery.</SizableText>
        </YStack>
      )}

      {/* Input */}
      <XStack paddingHorizontal="$3" paddingBottom="$3" space="$2" alignItems="center">
        <YStack flex={1} backgroundColor="$color4" borderRadius={20} paddingHorizontal="$3" paddingVertical="$1.5">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message…"
            placeholderTextColor={colors.textTertiary}
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={Platform.OS === 'web' ? handleSend : undefined}
            style={[{ fontSize: 14, color: colors.text, padding: 0, minHeight: 36 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]}
          />
        </YStack>
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: inputText.trim() ? '#2D6A4F' : 'rgba(255,255,255,0.1)',
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {sending ? <Spinner size="small" color="white" /> : <Send size={14} color="white" />}
        </Pressable>
      </XStack>
    </Card>
  );
}

export default function TrackOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  const prevStatus = useRef<string>('');
  const [justDelivered, setJustDelivered] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

  const fetchOrder = useCallback(async (showRefresh = false) => {
    if (!id) return;
    if (showRefresh) setRefreshing(true);
    try {
      const result = await blink.db.orders.get(id) as TrackedOrder;
      if (result) {
        if (prevStatus.current === 'pending' && result.status === 'delivered') {
          setJustDelivered(true);
        }
        prevStatus.current = result.status;
        setOrder(result);
      }
    } catch (err) {
      console.warn('[track] fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const handleAssignTestDriver = async () => {
    if (!id || !order) return;
    setTestBusy(true);
    try {
      const driver = TEST_DRIVERS[Math.floor(Math.random() * TEST_DRIVERS.length)];
      await blink.db.orders.update(id, {
        driver_name: driver.name,
        driver_photo_url: driver.photo,
      });
      await fetchOrder();
    } finally {
      setTestBusy(false);
    }
  };

  const handleTestDeliver = () => {
    // Delivery completion must happen in the driver flow so a real photo is
    // uploaded and the customer MMS is sent by the backend.
    if (Platform.OS === 'web') {
      window.alert('Use the driver app to complete delivery. A delivery photo is required so the customer receives the text.');
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
          if (msg.type === 'order-changed') fetchOrder();
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
    };
  }, [id, fetchOrder]);

  const isDelivered = order?.status === 'delivered';
  const hasDriver = !!(order?.driverName || order?.driverPhotoUrl);

  if (loading) {
    return (
      <SafeArea>
        <YStack flex={1} alignItems="center" justifyContent="center" space="$3">
          <Spinner size="large" color="$color9" />
          <SizableText color="$color10">Loading order…</SizableText>
        </YStack>
      </SafeArea>
    );
  }

  if (!order) {
    return (
      <SafeArea>
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" space="$4">
          <SizableText size="$5" fontWeight="700" color="$color12">Order not found</SizableText>
          <Pressable onPress={() => router.replace('/(customer)')} style={styles.btn}>
            <SizableText size="$4" fontWeight="700" color="white">Go Home</SizableText>
          </Pressable>
        </YStack>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      {/* Header */}
      <XStack
        paddingHorizontal="$4" paddingTop="$3" paddingBottom="$2"
        alignItems="center" space="$3"
        borderBottomWidth={1} borderBottomColor="$color4"
      >
        <Pressable onPress={() => router.replace('/(customer)/my-orders')} hitSlop={8}>
          <ChevronLeft size={24} color="$color10" />
        </Pressable>
        <YStack flex={1}>
          <SizableText size="$5" fontWeight="800" color="$color12">Track Order</SizableText>
          <SizableText size="$2" color="$color9" fontFamily="$mono">
            #{order?.id ? order.id.slice(-6).toUpperCase() : '------'}
          </SizableText>
        </YStack>
        {/* Live indicator */}
        <XStack
          space="$1" alignItems="center"
          paddingHorizontal="$2" paddingVertical="$1"
          borderRadius="$full"
          backgroundColor={isConnected ? '$green3' : '$color3'}
          borderWidth={1}
          borderColor={isConnected ? '$green6' : '$color6'}
        >
          <YStack
            width={6} height={6} borderRadius={3}
            backgroundColor={isConnected ? '$green9' : '$color8'}
          />
          <SizableText size="$1" fontWeight="700" color={isConnected ? '$green9' : '$color9'}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </SizableText>
        </XStack>
      </XStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrder(true)}
            tintColor="#22c55e"
          />
        }
      >
        <YStack padding="$4" space="$4" paddingBottom="$10">

          {/* ── Status hero ── */}
          <Animated.View entering={FadeInDown.springify()}>
            {isDelivered ? (
              <YStack
                backgroundColor="rgba(22,163,74,0.10)"
                borderRadius={20} borderWidth={1.5} borderColor="rgba(22,163,74,0.35)"
                padding="$6" alignItems="center" space="$3"
              >
                <YStack
                  width={80} height={80} borderRadius={40}
                  backgroundColor="rgba(22,163,74,0.18)"
                  alignItems="center" justifyContent="center"
                >
                  <CheckCircle size={44} color="$green9" />
                </YStack>
                <YStack alignItems="center" space="$1">
                  <SizableText size="$7" fontWeight="900" color="$green10">
                    {justDelivered ? '🎉 Delivered!' : 'Delivered'}
                  </SizableText>
                  <SizableText size="$3" color="$green9" textAlign="center">
                    Your order has been delivered successfully
                  </SizableText>
                </YStack>

                {/* Delivery photo from the driver */}
                {(order.deliveryPhotoUrl || order.delivery_photo_url) && (
                  <YStack
                    marginTop="$3"
                    width="100%"
                    borderRadius={14}
                    overflow="hidden"
                    borderWidth={1}
                    borderColor="rgba(22,163,74,0.25)"
                    backgroundColor="rgba(22,163,74,0.04)"
                  >
                    <XStack
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      backgroundColor="rgba(22,163,74,0.12)"
                      alignItems="center"
                      space="$2"
                    >
                      <SizableText size="$3" fontWeight="700" color="$green10">
                        📸 Delivery photo
                      </SizableText>
                    </XStack>
                    <Pressable
                      onPress={() => {
                        const url = order.deliveryPhotoUrl || order.delivery_photo_url || '';
                        if (url && typeof window !== 'undefined') window.open(url, '_blank');
                      }}
                    >
                      <Image
                        source={{ uri: order.deliveryPhotoUrl || order.delivery_photo_url || '' }}
                        style={{ width: '100%', height: 240, backgroundColor: '#0a0a0f' } as any}
                        resizeMode="cover"
                      />
                    </Pressable>
                    <XStack
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      backgroundColor="rgba(22,163,74,0.04)"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <SizableText size="$2" color="$green9">
                        Photo taken by your driver
                      </SizableText>
                      <SizableText size="$2" color="$green9" fontWeight="700">
                        Tap to enlarge
                      </SizableText>
                    </XStack>
                  </YStack>
                )}
              </YStack>
            ) : (
              <YStack
                backgroundColor="rgba(217,119,6,0.08)"
                borderRadius={20} borderWidth={1.5} borderColor="rgba(217,119,6,0.3)"
                padding="$5" alignItems="center" space="$3"
              >
                {/* Animated pulse ring */}
                <YStack position="relative" alignItems="center" justifyContent="center">
                  <YStack
                    width={80} height={80} borderRadius={40}
                    backgroundColor="rgba(217,119,6,0.15)"
                    alignItems="center" justifyContent="center"
                  >
                    <Clock size={40} color="$amber9" />
                  </YStack>
                </YStack>
                <YStack alignItems="center" space="$1">
                  <SizableText size="$6" fontWeight="900" color="$amber10">On the Way</SizableText>
                  <SizableText size="$3" color="$amber9" textAlign="center">
                    Your driver is heading to you
                  </SizableText>
                </YStack>
              </YStack>
            )}
          </Animated.View>

          {/* ── Progress steps ── */}
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <Card padding="$4" borderRadius="$4" backgroundColor="$color2" borderWidth={1} borderColor="$color4">
              <YStack space="$3">
                <SizableText size="$2" fontWeight="700" color="$color10" letterSpacing={0.5}>
                  ORDER STATUS
                </SizableText>
                {/* Step 1 */}
                <XStack space="$3" alignItems="center">
                  <YStack
                    width={32} height={32} borderRadius={16}
                    backgroundColor="$green3"
                    alignItems="center" justifyContent="center"
                  >
                    <CheckCircle size={18} color="$green9" />
                  </YStack>
                  <YStack flex={1}>
                    <SizableText size="$3" fontWeight="700" color="$color12">Order Placed</SizableText>
                    <SizableText size="$2" color="$color9">{timeAgo(order.created_at)}</SizableText>
                  </YStack>
                </XStack>

                {/* Connector */}
                <YStack marginLeft={15} width={2} height={16} backgroundColor={hasDriver ? '$green6' : '$color5'} />

                {/* Step 2 */}
                <XStack space="$3" alignItems="center">
                  <YStack
                    width={32} height={32} borderRadius={16}
                    backgroundColor={hasDriver ? '$green3' : '$color4'}
                    alignItems="center" justifyContent="center"
                  >
                    {hasDriver
                      ? <CheckCircle size={18} color="$green9" />
                      : <SizableText size="$3" fontWeight="800" color="$color9">2</SizableText>
                    }
                  </YStack>
                  <YStack flex={1}>
                    <SizableText size="$3" fontWeight="700" color={hasDriver ? '$color12' : '$color9'}>
                      Driver Assigned
                    </SizableText>
                    <SizableText size="$2" color="$color9">
                      {hasDriver ? `${order.driverName || 'Your driver'} is on the way` : 'Waiting for a driver…'}
                    </SizableText>
                  </YStack>
                </XStack>

                {/* Connector */}
                <YStack marginLeft={15} width={2} height={16} backgroundColor={isDelivered ? '$green6' : '$color5'} />

                {/* Step 3 */}
                <XStack space="$3" alignItems="center">
                  <YStack
                    width={32} height={32} borderRadius={16}
                    backgroundColor={isDelivered ? '$green3' : '$color4'}
                    alignItems="center" justifyContent="center"
                  >
                    {isDelivered
                      ? <CheckCircle size={18} color="$green9" />
                      : <SizableText size="$3" fontWeight="800" color="$color9">3</SizableText>
                    }
                  </YStack>
                  <YStack flex={1}>
                    <SizableText size="$3" fontWeight="700" color={isDelivered ? '$color12' : '$color9'}>
                      Delivered
                    </SizableText>
                    <SizableText size="$2" color="$color9">
                      {isDelivered ? 'Order complete!' : 'Your order will be delivered soon'}
                    </SizableText>
                  </YStack>
                </XStack>
              </YStack>
            </Card>
          </Animated.View>

          {/* ── Driver card ── */}
          {hasDriver && (
            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <Card padding="$4" borderRadius="$4" backgroundColor="$color2" borderWidth={1} borderColor="$color4">
                <YStack space="$3">
                  <SizableText size="$2" fontWeight="700" color="$color10" letterSpacing={0.5}>
                    YOUR DRIVER
                  </SizableText>
                  <XStack space="$3" alignItems="center">
                    <Avatar size="$5" borderRadius="$full" backgroundColor="rgba(22,163,74,0.15)">
                      {order.driverPhotoUrl
                        ? <Avatar.Image source={{ uri: order.driverPhotoUrl }} />
                        : <User size={26} color="$green9" />
                      }
                    </Avatar>
                    <YStack flex={1} space="$0.5">
                      <SizableText size="$4" fontWeight="700" color="$color12">
                        {order.driverName || 'Your Driver'}
                      </SizableText>
                      <SizableText size="$2" color="$green9">On the way to you</SizableText>
                    </YStack>
                    <YStack
                      paddingHorizontal="$2" paddingVertical="$1"
                      borderRadius="$full" backgroundColor="$green3"
                      borderWidth={1} borderColor="$green6"
                    >
                      <SizableText size="$1" fontWeight="800" color="$green9">EN ROUTE</SizableText>
                    </YStack>
                  </XStack>
                </YStack>
              </Card>
            </Animated.View>
          )}

          {/* ── Order details ── */}
          <Animated.View entering={FadeInDown.delay(240).springify()}>
            <Card padding="$4" borderRadius="$4" backgroundColor="$color2" borderWidth={1} borderColor="$color4">
              <YStack space="$3">
                <SizableText size="$2" fontWeight="700" color="$color10" letterSpacing={0.5}>
                  ORDER DETAILS
                </SizableText>
                <XStack space="$3" alignItems="flex-start">
                  <YStack width={32} height={32} borderRadius={16} backgroundColor="$color4" alignItems="center" justifyContent="center" flexShrink={0}>
                    <MapPin size={16} color="$color9" />
                  </YStack>
                  <YStack flex={1} space="$0.5">
                    <SizableText size="$2" color="$color9" fontWeight="600">DELIVERY ADDRESS</SizableText>
                    <SizableText size="$3" color="$color12">{order.delivery_address}</SizableText>
                  </YStack>
                </XStack>
                <XStack space="$3" alignItems="flex-start">
                  <YStack width={32} height={32} borderRadius={16} backgroundColor="$color4" alignItems="center" justifyContent="center" flexShrink={0}>
                    <Package size={16} color="$color9" />
                  </YStack>
                  <YStack flex={1} space="$0.5">
                    <SizableText size="$2" color="$color9" fontWeight="600">PICKUP INFO</SizableText>
                    <SizableText size="$3" color="$color12">{order.items}</SizableText>
                  </YStack>
                </XStack>
              </YStack>
            </Card>
          </Animated.View>

          {/* ── Actions ── */}
          <Animated.View entering={FadeInDown.delay(320).springify()}>
            <YStack space="$3">

              {/* Message Driver — only when driver is assigned and order is active */}
              {hasDriver && !isDelivered && (
                <CustomerOrderChat orderId={id!} customerName={order.customer_name} />
              )}

              {/* Test controls — only shown while order is pending */}
              {!isDelivered && (
                <YStack
                  borderRadius={14}
                  borderWidth={1}
                  borderColor="rgba(0,102,255,0.3)"
                  backgroundColor="rgba(0,102,255,0.06)"
                  padding="$3"
                  space="$2"
                >
                  <SizableText size="$1" fontWeight="700" color="$blue9" letterSpacing={0.5}>
                    ⚡ TEST CONTROLS — delivery requires a driver photo
                  </SizableText>
                  <XStack space="$2">
                    <Pressable
                      onPress={handleAssignTestDriver}
                      disabled={testBusy || !!order?.driverName}
                      style={({ pressed }) => ({
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        paddingVertical: 9,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: order?.driverName ? 'rgba(0,102,255,0.15)' : 'rgba(0,102,255,0.4)',
                        backgroundColor: order?.driverName ? 'rgba(0,102,255,0.04)' : 'rgba(0,102,255,0.12)',
                        opacity: (testBusy || !!order?.driverName) ? 0.5 : 1,
                      })}
                    >
                      {testBusy
                        ? <ActivityIndicator size="small" color="#3b82f6" />
                        : <SizableText size="$2" fontWeight="700" color="$blue9">
                            {order?.driverName ? '✓ Driver assigned' : 'Assign driver'}
                          </SizableText>
                      }
                    </Pressable>
                    <Pressable
                      onPress={handleTestDeliver}
                      disabled={testBusy}
                      style={({ pressed }) => ({
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        paddingVertical: 9,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(22,163,74,0.4)',
                        backgroundColor: pressed ? 'rgba(22,163,74,0.2)' : 'rgba(22,163,74,0.12)',
                        opacity: testBusy ? 0.5 : 1,
                      })}
                    >
                      {testBusy
                        ? <ActivityIndicator size="small" color="#16a34a" />
                        : <SizableText size="$2" fontWeight="700" color="$green9">Driver completes delivery</SizableText>
                      }
                    </Pressable>
                  </XStack>
                </YStack>
              )}

              <Pressable
                onPress={() => router.replace('/(customer)/my-orders')}
                style={({ pressed }) => [styles.outlineBtn, pressed && styles.btnPressed]}
              >
                <SizableText size="$4" fontWeight="700" color="$color12">View All My Orders</SizableText>
              </Pressable>

              <Pressable
                onPress={() => router.replace('/(customer)')}
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.btnPressed]}
              >
                <SizableText size="$3" color="$color9" textAlign="center">Place Another Order</SizableText>
              </Pressable>
            </YStack>
          </Animated.View>

        </YStack>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  outlineBtn: {
    height: 52,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  ghostBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});