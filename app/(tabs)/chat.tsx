import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
  StyleSheet,
  View,
  Text,
  ScrollView,
  BackHandler,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  YStack,
  SizableText,
  SafeArea,
  Spinner,
  MessageCircle,
  Truck,
} from '@blinkdotnew/mobile-ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useOrders, Order } from '@/lib/orders';
import { useOrderChat, getSavedDisplayName, saveDisplayName, ChatMessage } from '@/lib/chat';
import { chatApi, ApiChatSummary } from '@/apis/chat';
import { useDriverId } from '@/hooks/useDriverId';
import { colors, spacing, borderRadius } from '@/constants/design';
import {
  ConversationCard,
  ChatHeader,
  MessageBubble,
  DateSeparator,
  ChatInputBar,
  ChatEmptyState,
  ChatSectionHeader,
  ChatConversationItem,
} from '@/components/chat';

// ── Name setup prompt ────────────────────────────────────────────────────────

function NameSetupPrompt({ onSet }: { onSet: (name: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$4">
      <YStack width={72} height={72} borderRadius={36} backgroundColor="$color3" alignItems="center" justifyContent="center">
        <MessageCircle size={36} color="$color9" />
      </YStack>
      <YStack alignItems="center" gap="$1">
        <SizableText size="$6" fontWeight="800" color="$color12">Set Your Name</SizableText>
        <SizableText size="$3" color="$color10" textAlign="center">
          Customers will see this name when you message them.
        </SizableText>
      </YStack>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Your name (e.g. Alex)"
        placeholderTextColor="rgba(255, 255, 255, 0.4)"
        style={[styles.nameInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => value.trim() && onSet(value.trim())}
      />
      <Pressable
        onPress={() => value.trim() && onSet(value.trim())}
        style={[styles.nameBtn, !value.trim() && styles.nameBtnDisabled]}
        disabled={!value.trim()}
      >
        <SizableText size="$4" fontWeight="700" color="white">Continue</SizableText>
      </Pressable>
    </YStack>
  );
}

// ── Per-order chat view ──────────────────────────────────────────────────────

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

  const { messages, isConnected, sendMessage } = useOrderChat({
    orderId: order.id,
    orderStatus: order.status,
    displayName,
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

  const listItems = React.useMemo(() => {
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
        {messages.length === 0 ? (
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
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [nameReady, setNameReady] = useState(false);
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);
  const [apiChats, setApiChats] = useState<ApiChatSummary[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const driverId = useDriverId();

  const [chatsLoaded, setChatsLoaded] = useState(false);

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

  useEffect(() => {
    getSavedDisplayName().then((name) => {
      setDisplayName(name || null);
      setNameReady(true);
    });
  }, []);

  useEffect(() => {
    fetchChatsList();
    const interval = setInterval(fetchChatsList, 5000);
    return () => clearInterval(interval);
  }, [fetchChatsList]);

  const handleSetName = useCallback(async (name: string) => {
    await saveDisplayName(name);
    setDisplayName(name);
  }, []);

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

  if (!nameReady) {
    return (
      <SafeArea>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$color9" />
        </YStack>
      </SafeArea>
    );
  }

  if (!displayName) {
    return <SafeArea><NameSetupPrompt onSet={handleSetName} /></SafeArea>;
  }

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
      orderNumber: `#${shortId}`,
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
      orderNumber: `#${shortId}`,
      address: item.deliveryAddress || 'No delivery address',
      status: item.status,
      statusLabel: item.status === 'accepted' ? 'Heading to pickup' : isDelivered ? 'Delivered' : 'Delivering',
      statusVariant: isDelivered ? 'gray' : item.status === 'accepted' ? 'amber' : 'emerald',
      avatarVariant: isDelivered ? 'gray' : 'amber',
      distanceMiles: Number(item.distanceMiles ?? 0),
    };
  };

  const hasApiChats = apiChats.length > 0;

  return (
    <View style={styles.root}>
      <View style={[styles.appHeader, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSubtitleRow}>
          <Text style={styles.headerSubtitle}>
            {chatsLoaded
              ? apiChats.length > 0
                ? `${apiChats.length} conversation${apiChats.length > 1 ? 's' : ''}`
                : 'No active deliveries'
              : activeOrders.length > 0
              ? `${activeOrders.length} active conversation${activeOrders.length > 1 ? 's' : ''}`
              : 'No active deliveries'}
          </Text>
          <Text style={styles.headerDot}>·</Text>
          <Text style={[styles.headerStatusText, totalUnread > 0 && { color: '#FFE399' }]}>
            {totalUnread > 0 ? `${totalUnread} unread` : 'All read'}
          </Text>
        </View>
      </View>

      {!chatsLoaded && ordersLoading && !hasApiChats ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$color9" />
        </YStack>
      ) : chatsLoaded && !hasApiChats ? (
        <ChatEmptyState
          title="No Active Deliveries"
          subtitle="Accept an order from the feed to start messaging your customer."
          buttonText="Browse Orders"
          buttonIcon={<Truck size={16} color="white" />}
          onButtonPress={() => router.push('/(tabs)')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchChatsList();
              }}
              tintColor="#FFE399"
            />
          }
        >
          {hasApiChats ? (
            <>
              <ChatSectionHeader title="Conversations" count={apiChats.length} />
              {apiChats.map((chat) => (
                <ConversationCard
                  key={chat.orderId}
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
              ))}
            </>
          ) : (
            <>
              {activeOrders.length > 0 && (
                <>
                  <ChatSectionHeader title="Active Orders" count={activeOrders.length} />
                  {activeOrders.map((item) => (
                    <ConversationCard
                      key={item.id}
                      item={mapOrderToItem(item)}
                      role="driver"
                      onPress={() => setActiveChatOrder(item)}
                    />
                  ))}
                </>
              )}

              {recentOrders.length > 0 && (
                <>
                  <ChatSectionHeader title="Recent" count={recentOrders.length} marginTop={activeOrders.length > 0 ? 14 : 0} />
                  {recentOrders.map((item) => (
                    <ConversationCard
                      key={item.id}
                      item={mapOrderToItem(item)}
                      role="driver"
                      onPress={() => setActiveChatOrder(item)}
                    />
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
    fontWeight: '700',
    color: '#DFE2EF',
    letterSpacing: -0.5,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(194, 198, 216, 0.7)',
  },
  headerDot: {
    fontSize: 13,
    color: 'rgba(194, 198, 216, 0.4)',
  },
  headerStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00E297',
    opacity: 0.85,
  },
  nameInput: {
    width: '100%',
    height: 52,
    backgroundColor: '#181C28',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.gutter,
    fontSize: 16,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nameBtn: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBtnDisabled: {
    opacity: 0.4,
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
