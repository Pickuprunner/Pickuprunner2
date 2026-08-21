import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  View,
  Text,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { blink } from '@/lib/blink';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrderChat, ChatMessage } from '@/lib/chat';
import { CustomerOrderData } from '@/components/Orders';
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

const STATIC_CONVERSATIONS: CustomerOrderData[] = [
  {
    id: 'ord-6ef6bf-sample',
    customerName: 'Jamie Test',
    customerPhone: '(520) 555-1234',
    pickupAddress: '5765 S Camino del Sol, Green Valley, AZ 85622',
    deliveryAddress: '1234 Sunset Blvd',
    items: '[LEAVE AT DOOR] #1042',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    tipAmount: 500,
    distanceMiles: 4.2,
    driverName: 'Alex Rivera',
  },
  {
    id: 'ord-jqspfm-sample',
    customerName: 'Jamie Test',
    customerPhone: '(520) 555-1234',
    pickupAddress: '5765 S Camino del Sol, Green Valley, AZ 85622',
    deliveryAddress: '88 Clementine Court',
    items: '[MEET AT DOOR] Hand off at door',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    tipAmount: 1000,
    distanceMiles: 6.8,
    driverName: 'Sarah Kim',
  },
];

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

  const { messages, isConnected, sendMessage } = useOrderChat({
    orderId: order.id,
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
    if (!text || sending) return;
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
  }, [inputText, sending, sendMessage, isConnected, showToast]);

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
      const isMine = msg.role === 'customer';
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
        isLive={isConnected}
        onBack={onBack}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
      </KeyboardAvoidingView>
    </View>
  );
}

export default function CustomerChatScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<CustomerOrderData[]>(STATIC_CONVERSATIONS);
  const [activeChatOrder, setActiveChatOrder] = useState<CustomerOrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customerName, setCustomerName] = useState('Customer');

  const fetchOrders = useCallback(async () => {
    let local: CustomerOrderData[] = [];
    try {
      const raw = await AsyncStorage.getItem('customer_local_orders');
      if (raw) local = JSON.parse(raw);
    } catch { }

    const name = (await AsyncStorage.getItem('customer_display_name')) || 'Customer';
    setCustomerName(name);

    try {
      const authUser = await blink.auth.me().catch(() => null);
      const userEmail = authUser?.email;
      const sid = await AsyncStorage.getItem('customer_session_id');

      const fetchPromise = Promise.all([
        sid
          ? blink.db.orders.list({ where: { customer_session_id: sid }, limit: 20 }).catch(() => [])
          : Promise.resolve([]),
        userEmail
          ? blink.db.orders.list({ where: { customer_email: userEmail }, limit: 20 }).catch(() => [])
          : Promise.resolve([]),
      ]);

      const timeoutPromise = new Promise((res) => setTimeout(() => res([]), 3000));
      const [res1, res2] = (await Promise.race([fetchPromise, timeoutPromise])) as any[];

      const map = new Map<string, CustomerOrderData>();
      (STATIC_CONVERSATIONS || []).forEach((o) => o?.id && map.set(o.id, o));
      (local || []).forEach((o) => o?.id && map.set(o.id, o));
      (res1 || []).forEach((o: any) => o?.id && map.set(o.id, o));
      (res2 || []).forEach((o: any) => o?.id && map.set(o.id, o));

      setOrders(Array.from(map.values()));
    } catch {
      const map = new Map<string, CustomerOrderData>();
      (STATIC_CONVERSATIONS || []).forEach((o) => o?.id && map.set(o.id, o));
      (local || []).forEach((o) => o?.id && map.set(o.id, o));
      setOrders(Array.from(map.values()));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (activeChatOrder) {
    return (
      <CustomerOrderChatView
        order={activeChatOrder}
        customerName={customerName}
        onBack={() => setActiveChatOrder(null)}
      />
    );
  }

  const activeOrders = orders.filter((o) => o.status !== 'delivered');
  const recentOrders = orders.filter((o) => o.status === 'delivered');

  const mapToChatItem = (item: CustomerOrderData): ChatConversationItem => {
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.screenHeader, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.headerTitle}>Driver Chat</Text>
        <View style={styles.headerSubtitleRow}>
          <LiveBadge label="Live" isLive />
          <Text style={styles.headerSubtitle}>
            {activeOrders.length > 0
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
            }}
            tintColor="#FFE399"
          />
        }
        ListHeaderComponent={
          <>
            {activeOrders.length > 0 && (
              <>
                <ChatSectionHeader title="On Active Order" count={activeOrders.length} />
                {activeOrders.map((item, idx) => (
                  <Animated.View key={item.id} entering={FadeInDown.delay(idx * 50).springify()}>
                    <ConversationCard
                      item={mapToChatItem(item)}
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
                      item={mapToChatItem(item)}
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
        }
        ListEmptyComponent={
          loading ? (
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
          ) : activeOrders.length === 0 && recentOrders.length === 0 ? (
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
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 12,
  },
  conversationCard: {
    backgroundColor: '#151821',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  convoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 227, 153, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convoAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFE399',
  },
  convoDetails: {
    flex: 1,
    gap: 3,
  },
  convoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convoDriverName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DFE2EF',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    borderColor: 'rgba(0, 102, 255, 0.3)',
  },
  statusBadgeDelivered: {
    backgroundColor: 'rgba(0, 226, 151, 0.10)',
    borderColor: 'rgba(0, 226, 151, 0.3)',
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  convoSubtitle: {
    fontSize: 12.5,
    color: '#8C90A1',
  },
  convoFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  convoTapHint: {
    fontSize: 11.5,
    color: '#FFE399',
    fontWeight: '600',
  },
  chatHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 64 : 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderDriverName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DFE2EF',
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: '#8C90A1',
    marginTop: 1,
  },
  messagesListPadding: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  messageBubbleContainer: {
    marginBottom: 8,
  },
  senderLabel: {
    fontSize: 11,
    color: '#8C90A1',
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: '#0066FF',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#1C202C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bubbleTextOther: {
    color: '#DFE2EF',
  },
  bubbleTime: {
    fontSize: 10.5,
    color: '#8C90A1',
    marginTop: 4,
    marginHorizontal: 4,
  },
  dateSeparatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  dateDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  dateText: {
    fontSize: 11,
    color: '#8C90A1',
    fontWeight: '700',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F131C',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  inputFieldContainer: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    backgroundColor: '#151821',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  textInput: {
    color: '#DFE2EF',
    fontSize: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  emptyChatContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  emptyChatIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyChatTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DFE2EF',
  },
  emptyChatSubtitle: {
    fontSize: 13.5,
    color: '#8C90A1',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 300,
  },
  quickPromptsContainer: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  quickPromptsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C90A1',
    letterSpacing: 1,
    textAlign: 'center',
  },
  quickPromptsGrid: {
    gap: 8,
  },
  quickPromptPill: {
    backgroundColor: '#151821',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  quickPromptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFE399',
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
  loadingText: {
    fontSize: 14,
    color: '#8C90A1',
    fontWeight: '600',
  },
});
