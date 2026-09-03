import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  Text,
  ScrollView,
  BackHandler,
  StatusBar,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ordersApi } from '@/apis/orders';
import {
  YStack,
  Spinner,
  Truck,
} from '@blinkdotnew/mobile-ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useOrders, Order } from '@/lib/orders';
import { useOrderChat, getSavedDisplayName, ChatMessage } from '@/lib/chat';
import { chatApi, ApiChatSummary } from '@/apis/chat';
import { useDriverId } from '@/hooks/useDriverId';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/constants/design';
import { CustomLoading, CustomRefreshControl } from '@/components/core';
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

const DRIVER_QUICK_PROMPTS = [
  'On my way',
  'Arrived at pickup',
  'Dropped off safely',
  'Running 5 mins behind',
];

function OrderChatView({ order, displayName, onBack }: { order: Order; displayName: string; onBack: () => void }) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const shortId = order.id ? order.id.slice(-6).toUpperCase() : '------';
  const isClosed = order.status === 'delivered' || order.status === 'cancelled';

  const { messages, isLoading, isConnected, sendMessage } = useOrderChat({
    orderId: order.id,
    orderStatus: order.status,
    displayName: displayName || 'Driver',
    role: 'driver',
  });

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async (customText?: string) => {
    const text = (customText || inputText).trim();
    if (!text || sending || isClosed) return;
    setInputText('');
    setSending(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    try {
      await sendMessage(text);
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, isClosed, sendMessage]);

  const listItems = useMemo(() => {
    const items: ({ type: 'date'; ts: number; key: string } | { type: 'message'; msg: ChatMessage; isMine: boolean; key: string })[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const dateStr = new Date(msg.timestamp).toDateString();
      if (dateStr !== lastDate) {
        items.push({ type: 'date', ts: msg.timestamp, key: `date-${msg.timestamp}` });
        lastDate = dateStr;
      }
      const isMine = msg.mine === true || msg.role === 'driver';
      items.push({ type: 'message', msg, isMine, key: msg.id });
    }
    return items;
  }, [messages]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ChatHeader
        title={order.customerName || 'Customer'}
        orderNumber={shortId}
        subtitle={order.deliveryAddress || 'No delivery address'}
        isLive={!isClosed && isConnected}
        onBack={onBack}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isLoading && messages.length === 0 ? (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <CustomLoading size="large" />
          </YStack>
        ) : messages.length === 0 ? (
          <ChatEmptyState
            title="No messages yet"
            subtitle="Message your customer about pickup time, drop-off updates, or gate codes."
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
            contentContainerStyle={{ paddingVertical: 12 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {isClosed ? (
          <View style={styles.closedChatBanner}>
            <Text style={styles.closedChatText}>
              You can no longer message this customer after your delivery has ended.
            </Text>
          </View>
        ) : (
          <ChatInputBar
            value={inputText}
            onChangeText={setInputText}
            onSend={() => handleSend()}
            sending={sending}
            disabled={!isConnected}
            placeholder={`Message ${order.customerName?.split(' ')[0] || 'customer'}…`}
            accentColor={colors.primaryContainer}
            quickPrompts={DRIVER_QUICK_PROMPTS}
            onSelectPrompt={(p) => handleSend(p)}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [savedName, setSavedName] = useState<string>('');
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);
  const [apiChats, setApiChats] = useState<ApiChatSummary[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const driverId = useDriverId();

  const [chatsLoaded, setChatsLoaded] = useState(false);

  useEffect(() => {
    getSavedDisplayName().then((name) => {
      if (name) setSavedName(name);
    });
  }, []);

  const displayName = savedName || user?.displayName || user?.email?.split('@')[0] || 'Driver';

  useEffect(() => {
    if (!orderId) return;
    const match = orders.find((o) => o.id === orderId);
    if (match) {
      setActiveChatOrder(match);
      router.setParams({ orderId: '' });
    } else {
      ordersApi
        .getById(orderId)
        .then((res) => {
          const o = res as any;
          if (o && o.id) {
            setActiveChatOrder(o);
          }
          router.setParams({ orderId: '' });
        })
        .catch(() => {
          router.setParams({ orderId: '' });
        });
    }
  }, [orderId, orders]);

  const fetchChatsList = useCallback(async () => {
    try {
      const res = await chatApi.getChats({ includeClosed: true });
      const valid = (res.chats || []).filter((c) => c.orderStatus !== 'pending' && !c.awaitingDriver);
      setApiChats(valid);
      setTotalUnread(res.totalUnread || 0);
    } catch (err) {
      console.warn('[ChatScreen] Error fetching GET /chats:', err);
    } finally {
      setRefreshing(false);
      setChatsLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchChatsList();
      if (!orderId) {
        setActiveChatOrder(null);
      }
      return () => {
        setActiveChatOrder(null);
      };
    }, [fetchChatsList, orderId])
  );

  useEffect(() => {
    if (!activeChatOrder) return;
    const onBackPress = () => {
      setActiveChatOrder(null);
      fetchChatsList();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [activeChatOrder, fetchChatsList]);

  if (activeChatOrder) {
    return (
      <OrderChatView
        order={activeChatOrder}
        displayName={displayName}
        onBack={() => {
          setActiveChatOrder(null);
          fetchChatsList();
        }}
      />
    );
  }

  const activeOrders = orders.filter(
    (o) => o.driverUserId === driverId && (o.status === 'accepted' || o.status === 'picked_up')
  );

  const recentOrders = orders.filter(
    (o) => o.driverUserId === driverId && o.status === 'delivered'
  );

  const mapApiChatToItem = (chat: ApiChatSummary): ChatConversationItem => {
    const shortId = chat.orderId ? chat.orderId.slice(-6).toUpperCase() : '------';
    const isDelivered = chat.orderStatus === 'delivered';
    return {
      id: chat.orderId,
      name: chat.counterpartyName || 'Customer',
      orderNumber: `#ORD-${shortId}`,
      address: chat.deliveryAddress || 'No delivery address',
      status: chat.orderStatus,
      statusLabel: chat.orderStatus === 'accepted' ? 'Heading to pickup' : isDelivered ? 'Delivered' : 'Delivering',
      statusVariant: isDelivered ? 'gray' : chat.orderStatus === 'accepted' ? 'amber' : 'emerald',
      avatarVariant: isDelivered ? 'gray' : 'amber',
      unreadCount: chat.unread || 0,
      orderMetaText: chat.lastMessage?.body,
      time: chat.lastMessage?.createdAt ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    };
  };

  const mapOrderToItem = (item: Order): ChatConversationItem => {
    const shortId = item?.id ? item.id.slice(-6).toUpperCase() : '------';
    const isDelivered = item.status === 'delivered';
    return {
      id: item.id,
      name: item.customerName || 'Customer',
      orderNumber: `#ORD-${shortId}`,
      address: item.deliveryAddress || 'No delivery address',
      status: item.status,
      statusLabel: item.status === 'accepted' ? 'Heading to pickup' : isDelivered ? 'Delivered' : 'Delivering',
      statusVariant: isDelivered ? 'gray' : item.status === 'accepted' ? 'amber' : 'emerald',
      avatarVariant: isDelivered ? 'gray' : 'amber',
      distanceMiles: Number(item.distanceMiles ?? 0),
    };
  };

  const hasApiChats = apiChats.length > 0;
  const conversationCount = hasApiChats ? apiChats.length : activeOrders.length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.appHeader, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSubtitleRow}>
          <LiveBadge label="Live" isLive={conversationCount > 0} />
          <Text style={styles.headerSubtitle}>
            {chatsLoaded
              ? apiChats.length > 0
                ? `${apiChats.length} active conversation${apiChats.length > 1 ? 's' : ''}`
                : 'Direct messages with your customer'
              : activeOrders.length > 0
                ? `${activeOrders.length} active conversation${activeOrders.length > 1 ? 's' : ''}`
                : 'Direct messages with your customer'}
          </Text>
        </View>
      </View>

      {!chatsLoaded && ordersLoading && !hasApiChats ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <CustomLoading size="large" />
        </YStack>
      ) : chatsLoaded && !hasApiChats && activeOrders.length === 0 && recentOrders.length === 0 ? (
        <ChatEmptyState
          title="No Active Deliveries"
          subtitle="Accept an order from the feed to start messaging your customer."
          buttonText="Browse Orders"
          buttonIcon={<Truck size={16} color="white" />}
          onButtonPress={() => router.push('/(tabs)')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <CustomRefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                Promise.resolve(fetchChatsList()).finally(() => {
                  setRefreshing(false);
                });
              }}
            />
          }
        >
          {hasApiChats ? (
            <>
              <ChatSectionHeader title="Active Conversations" count={apiChats.length} />
              {apiChats.map((chat, idx) => (
                <Animated.View key={chat.orderId} entering={FadeInDown.delay(idx * 50).springify()}>
                  <ConversationCard
                    item={mapApiChatToItem(chat)}
                    role="driver"
                    onPress={() =>
                      setActiveChatOrder({
                        id: chat.orderId,
                        customerName: chat.counterpartyName || 'Customer',
                        deliveryAddress: chat.deliveryAddress || '',
                        status: chat.orderStatus as any,
                      } as any)
                    }
                  />
                </Animated.View>
              ))}
            </>
          ) : (
            <>
              {activeOrders.length > 0 && (
                <>
                  <ChatSectionHeader title="Active Orders" count={activeOrders.length} />
                  {activeOrders.map((item, idx) => (
                    <Animated.View key={item.id} entering={FadeInDown.delay(idx * 50).springify()}>
                      <ConversationCard
                        item={mapOrderToItem(item)}
                        role="driver"
                        onPress={() => setActiveChatOrder(item)}
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
                        item={mapOrderToItem(item)}
                        role="driver"
                        onPress={() => setActiveChatOrder(item)}
                      />
                    </Animated.View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  appHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
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
