import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  StatusBar,
  RefreshControl,
  BackHandler,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ordersApi } from '@/apis/orders';
import { useAuthStore } from '@/store/useAuthStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrderChat, ChatMessage } from '@/lib/chat';
import { chatApi, ApiChatSummary } from '@/apis/chat';
import { CustomerOrderData } from '@/components/Orders';
import { useOrderStore } from '@/store/useOrderStore';
import { useOrdersRealtime } from '@/lib/realtime';
import { useToast, CustomSkeleton } from '@/components/core';
import { colors } from '@/constants/design';
import {
  ConversationCard,
  ChatHeader,
  MessageBubble,
  DateSeparator,
  ChatInputBar,
  ChatEmptyState,
  ChatSectionHeader,
  LiveBadge,
  ChatConversationItem,
} from '@/components/chat';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  }
}

const QUICK_PROMPTS = [
  'Please leave it by front door',
  'Gate code is #1042',
  'Please ring the doorbell',
  'Thank you so much!',
];

function CustomerOrderChatView({
  order,
  customerName,
  onBack,
}: {
  order: CustomerOrderData;
  customerName: string;
  onBack: () => void;
}) {
  const { showToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const shortId = order.id ? order.id.slice(-6).toUpperCase() : '------';
  const driverDisplayName = order.driverName || order.driver_name || 'Assigned Driver';
  const isClosed = order.status === 'delivered' || order.status === 'cancelled';

  const { messages, isConnected, sendMessage } = useOrderChat({
    orderId: order.id,
    orderStatus: order.status,
    displayName: customerName || 'Customer',
    role: 'customer',
  });

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async (customText?: string) => {
    const text = (customText || inputText).trim();
    if (!text || sending || isClosed) return;
    if (!isConnected) {
      showToast('Chat is currently offline', {
        type: 'warning',
        description: 'Reconnecting to live messaging...',
      });
    }
    setInputText('');
    setSending(true);
    haptic();
    try {
      await sendMessage(text);
    } catch {
      setInputText(text);
      showToast('Message delivery failed', {
        type: 'error',
        description: 'Please check your connection and retry.',
      });
    } finally {
      setSending(false);
    }
  }, [inputText, sending, isClosed, sendMessage, isConnected, showToast]);

  const listItems = useMemo(() => {
    const items: (
      | { type: 'date'; ts: number; key: string }
      | { type: 'message'; msg: ChatMessage; isMine: boolean; key: string }
    )[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const dateStr = new Date(msg.timestamp).toDateString();
      if (dateStr !== lastDate) {
        items.push({ type: 'date', ts: msg.timestamp, key: `date-${msg.timestamp}` });
        lastDate = dateStr;
      }
      const isMine = msg.mine === true || msg.role === 'customer';
      items.push({ type: 'message', msg, isMine, key: msg.id });
    }
    return items;
  }, [messages]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ChatHeader
        title={driverDisplayName}
        orderNumber={shortId}
        subtitle={order.status === 'delivered' ? 'Delivered' : 'Live Delivery'}
        isLive={!isClosed && isConnected}
        onBack={onBack}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <ChatEmptyState
            title="Direct Driver Chat"
            subtitle="Ask about pickup time, provide gate codes, or leave drop-off instructions."
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={listItems}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => {
              if (item.type === 'date') return <DateSeparator ts={item.ts} />;
              return <MessageBubble msg={item.msg} isMine={item.isMine} />;
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesListPadding}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {isClosed ? (
          <View style={styles.closedChatBanner}>
            <Text style={styles.closedChatText}>
              You can no longer message this driver after your delivery has ended.
            </Text>
          </View>
        ) : (
          <ChatInputBar
            value={inputText}
            onChangeText={setInputText}
            onSend={() => handleSend()}
            sending={sending}
            disabled={!isConnected}
            placeholder={`Message ${driverDisplayName.split(' ')[0]}...`}
            accentColor={colors.primaryContainer}
            quickPrompts={QUICK_PROMPTS}
            onSelectPrompt={(p) => handleSend(p)}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

export default function CustomerChatScreen() {
  const insets = useSafeAreaInsets();
  const storeOrders = useOrderStore((state) => state.orders);
  const [orders, setOrders] = useState<CustomerOrderData[]>([]);
  const [apiChats, setApiChats] = useState<ApiChatSummary[]>([]);
  const [activeChatOrder, setActiveChatOrder] = useState<CustomerOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerName, setCustomerName] = useState('Customer');
  const [chatsLoaded, setChatsLoaded] = useState(false);

  const fetchChatsList = useCallback(async () => {
    try {
      const res = await chatApi.getChats({ includeClosed: true });
      const valid = (res.chats || []).filter((c) => c.orderStatus !== 'pending' && !c.awaitingDriver);
      setApiChats(valid);
    } catch (err) {
      console.warn('[CustomerChatScreen] Error fetching GET /chats:', err);
    } finally {
      setChatsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchChatsList();
    const interval = setInterval(fetchChatsList, 5000);
    return () => clearInterval(interval);
  }, [fetchChatsList]);

  const fetchOrders = useCallback(async () => {
    let local: CustomerOrderData[] = [];
    try {
      const raw = await AsyncStorage.getItem('customer_local_orders');
      if (raw) local = JSON.parse(raw);
    } catch { }

    const name = (await AsyncStorage.getItem('customer_display_name')) || 'Customer';
    setCustomerName(name);

    try {
      const token = useAuthStore.getState().token;
      const backendMine = token ? await ordersApi.getMine().catch(() => null) : null;

      const map = new Map<string, CustomerOrderData>();
      if (Array.isArray(backendMine)) {
        backendMine.forEach((o) => o?.id && map.set(o.id, o as any));
      } else {
        (local || []).forEach((o) => o?.id && map.set(o.id, o));
      }

      setOrders(Array.from(map.values()));
    } catch {
      setOrders(local || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Instant reactive update when driver accepts/updates order
  useEffect(() => {
    if (storeOrders && storeOrders.length > 0) {
      setOrders((prev) => {
        const map = new Map<string, CustomerOrderData>();
        (prev || []).forEach((o) => o?.id && map.set(o.id, o));
        storeOrders.forEach((so) => {
          if (so?.id) {
            const existing = map.get(so.id);
            map.set(so.id, {
              ...(existing || {}),
              id: so.id,
              status: so.status as any,
              customerName: so.customerName || existing?.customerName || 'Customer',
              customerPhone: so.customerPhone || existing?.customerPhone,
              pickupAddress: so.pickupAddress || existing?.pickupAddress || '',
              deliveryAddress: so.deliveryAddress || existing?.deliveryAddress || '',
              items: so.items || existing?.items || '',
              driverName: so.driverName || existing?.driverName,
              driver_name: so.driverName || existing?.driver_name,
              driverUserId: so.driverUserId,
              deliveryPhotoUrl: so.deliveryPhotoUrl || existing?.deliveryPhotoUrl,
              delivery_photo_url: so.deliveryPhotoUrl || existing?.delivery_photo_url,
              tipAmount: so.tipAmount ?? existing?.tipAmount,
              distanceMiles: so.distanceMiles ?? existing?.distanceMiles,
              createdAt: so.createdAt || existing?.createdAt,
            } as any);
          }
        });
        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(b.createdAt || b.created_at || 0).getTime() -
            new Date(a.createdAt || a.created_at || 0).getTime()
        );
      });
    }
  }, [storeOrders]);

  useOrdersRealtime(useCallback(() => {
    fetchOrders();
    fetchChatsList();
  }, [fetchOrders, fetchChatsList]));

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle hardware/gesture back press when in individual chat view
  useEffect(() => {
    if (!activeChatOrder) return;
    const onBackPress = () => {
      setActiveChatOrder(null);
      fetchChatsList();
      return true; // prevent navigating away from screen
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [activeChatOrder, fetchChatsList]);

  if (activeChatOrder) {
    return (
      <CustomerOrderChatView
        order={activeChatOrder}
        customerName={customerName}
        onBack={() => {
          setActiveChatOrder(null);
          fetchChatsList();
        }}
      />
    );
  }

  const activeOrders = orders.filter((o) => o.status !== 'delivered');
  const recentOrders = orders.filter((o) => o.status === 'delivered');

  const mapApiChatToItem = (chat: ApiChatSummary): ChatConversationItem => {
    const shortId = chat.orderId ? chat.orderId.slice(-6).toUpperCase() : '------';
    const isDelivered = chat.orderStatus === 'delivered';
    return {
      id: chat.orderId,
      name: chat.counterpartyName || 'Driver',
      orderNumber: `#ORD-${shortId}`,
      orderMetaText: chat.lastMessage?.body || (isDelivered ? 'Delivered' : 'Active order'),
      address: chat.deliveryAddress || 'Delivery Address',
      time: chat.lastMessage?.createdAt ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      status: chat.orderStatus,
      statusLabel: isDelivered ? 'Delivered' : 'Active order',
      statusVariant: isDelivered ? 'gray' : 'emerald',
      avatarVariant: isDelivered ? 'gray' : 'mint',
      unreadCount: chat.unread || 0,
    };
  };

  const mapOrderToChatItem = (item: CustomerOrderData): ChatConversationItem => {
    const shortId = item.id ? item.id.slice(-6).toUpperCase() : '------';
    const driverName = item.driverName || item.driver_name || 'Driver';
    const isDelivered = item.status === 'delivered';

    return {
      id: item.id,
      name: driverName,
      orderNumber: `#ORD-${shortId}`,
      orderMetaText: isDelivered ? 'Delivered 12 min ago' : 'Started 8 min ago',
      address: item.deliveryAddress || item.delivery_address || 'Sahuarita, AZ',
      time: isDelivered ? '12m' : '8m',
      status: item.status,
      statusLabel: isDelivered ? 'Delivered' : 'Active order',
      statusVariant: isDelivered ? 'gray' : 'emerald',
      avatarVariant: isDelivered ? 'gray' : 'mint',
      distanceMiles: item.distanceMiles,
    };
  };

  const hasApiChats = apiChats.length > 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.screenHeader, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSubtitleRow}>
          <LiveBadge label="Live" isLive />
          <Text style={styles.headerSubtitle}>
            {chatsLoaded
              ? apiChats.length > 0
                ? `${apiChats.length} active conversation${apiChats.length > 1 ? 's' : ''}`
                : 'Direct messages with your delivery driver'
              : activeOrders.length > 0
                ? `${activeOrders.length} driver${activeOrders.length > 1 ? 's' : ''} on route`
                : 'Direct messages with your delivery driver'}
          </Text>
        </View>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchOrders();
              fetchChatsList();
            }}
            tintColor="#FFE399"
          />
        }
        ListHeaderComponent={
          <>
            {hasApiChats ? (
              <>
                <ChatSectionHeader title="Active Conversations" count={apiChats.length} />
                {apiChats.map((item, idx) => (
                  <Animated.View key={item.orderId} entering={FadeInDown.delay(idx * 50).springify()}>
                    <ConversationCard
                      item={mapApiChatToItem(item)}
                      role="customer"
                      onPress={() => {
                        haptic();
                        setActiveChatOrder({
                          id: item.orderId,
                          driverName: item.counterpartyName || 'Driver',
                          driver_name: item.counterpartyName || 'Driver',
                          deliveryAddress: item.deliveryAddress || '',
                          status: item.orderStatus as any,
                        } as any);
                      }}
                    />
                  </Animated.View>
                ))}
              </>
            ) : (
              <>
                {activeOrders.length > 0 && (
                  <>
                    <ChatSectionHeader title="On Active Order" count={activeOrders.length} />
                    {activeOrders.map((item, idx) => (
                      <Animated.View key={item.id} entering={FadeInDown.delay(idx * 50).springify()}>
                        <ConversationCard
                          item={mapOrderToChatItem(item)}
                          role="customer"
                          onPress={() => {
                            haptic();
                            setActiveChatOrder(item);
                          }}
                        />
                      </Animated.View>
                    ))}
                  </>
                )}

                {recentOrders.length > 0 && (
                  <>
                    <ChatSectionHeader
                      title="Recently Completed"
                      count={recentOrders.length}
                      marginTop={activeOrders.length > 0 ? 18 : 0}
                    />
                    {recentOrders.map((item, idx) => (
                      <Animated.View key={item.id} entering={FadeInDown.delay((activeOrders.length + idx) * 50).springify()}>
                        <ConversationCard
                          item={mapOrderToChatItem(item)}
                          role="customer"
                          onPress={() => {
                            haptic();
                            setActiveChatOrder(item);
                          }}
                        />
                      </Animated.View>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        }
        ListEmptyComponent={
          loading && !hasApiChats ? (
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.skeletonConvoCard}>
                  <CustomSkeleton width={48} height={48} circle />
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <CustomSkeleton width={120} height={16} borderRadius={6} />
                      <CustomSkeleton width={74} height={20} borderRadius={999} />
                    </View>
                    <CustomSkeleton width="80%" height={12} borderRadius={4} />
                    <CustomSkeleton width="45%" height={10} borderRadius={4} />
                  </View>
                </View>
              ))}
            </View>
          ) : !hasApiChats && activeOrders.length === 0 && recentOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="forum" size={36} color="#FFE399" />
              </View>
              <Text style={styles.emptyTitle}>No Active Chats</Text>
              <Text style={styles.emptySubtitle}>
                When a driver accepts your pickup request, you will be able to message them directly here.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(customer)')}
                style={styles.requestBtn}
              >
                <Text style={styles.requestBtnText}>Request a Pickup</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  screenHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#DFE2EF',
    letterSpacing: -0.5,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(194, 198, 216, 0.7)',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 12,
  },
  skeletonConvoCard: {
    backgroundColor: '#151821',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  messagesListPadding: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DFE2EF',
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#8C90A1',
    textAlign: 'center',
    lineHeight: 19,
  },
  requestBtn: {
    marginTop: 8,
    backgroundColor: '#0066FF',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  requestBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  closedChatBanner: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: '#151821',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedChatText: {
    fontSize: 13.5,
    color: 'rgba(194, 198, 216, 0.7)',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 19,
  },
});
