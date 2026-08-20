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
import { useOrderChat, ChatMessage } from '@/lib/chat';
import { CustomerOrderData } from '@/components/Orders';
import { useToast, CustomSkeleton } from '@/components/core';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

const STATIC_CONVERSATIONS: CustomerOrderData[] = [
  {
    id: 'ord-6ef6bf-sample',
    customerName: 'Jamie Test',
    customerPhone: '(520) 555-1234',
    pickupAddress: '5765 S Camino del Sol, Green Valley, AZ 85622',
    deliveryAddress: '123 E Test Ave, Sahuarita, AZ 85629',
    items: '[LEAVE AT DOOR] #1042',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    tipAmount: 500,
    distanceMiles: 4.2,
    driverName: 'Alex Rivera',
  },
  {
    id: 'ord-jqspfm-sample',
    customerName: 'Jamie Test',
    customerPhone: '(520) 555-1234',
    pickupAddress: '5765 S Camino del Sol, Green Valley, AZ 85622',
    deliveryAddress: '123 E Test Ave, Sahuarita, AZ 85629',
    items: '[MEET AT DOOR] Hand off at door',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    tipAmount: 1000,
    distanceMiles: 6.8,
    driverName: 'Sarah Kim',
  },
];

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function MessageBubble({
  msg,
  isMine,
}: {
  msg: ChatMessage;
  isMine: boolean;
}) {
  return (
    <View
      style={[
        styles.messageBubbleContainer,
        { alignItems: isMine ? 'flex-end' : 'flex-start' },
      ]}
    >
      {!isMine && (
        <Text style={styles.senderLabel}>
          🚚 Driver · {msg.senderName || 'Driver'}
        </Text>
      )}

      <View style={{ maxWidth: '80%' }}>
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
          ]}
        >
          <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
            {msg.text}
          </Text>
        </View>

        <Text
          style={[
            styles.bubbleTime,
            { alignSelf: isMine ? 'flex-end' : 'flex-start' },
          ]}
        >
          {formatTime(msg.timestamp)}
        </Text>
      </View>
    </View>
  );
}

function DateSeparator({ ts }: { ts: number }) {
  return (
    <View style={styles.dateSeparatorRow}>
      <View style={styles.dateDivider} />
      <Text style={styles.dateText}>{formatDate(ts)}</Text>
      <View style={styles.dateDivider} />
    </View>
  );
}

const QUICK_PROMPTS = [
  'Please leave it by front door 🚪',
  'Gate code is #1042 🔑',
  'Please ring the doorbell 🔔',
  'Thank you so much! 🙏',
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

      {/* Header */}
      <View style={styles.chatHeaderBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.backBtn}>
          <MaterialIcons name="chevron-left" size={28} color="#DFE2EF" />
        </TouchableOpacity>

        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderDriverName} numberOfLines={1}>
            {driverDisplayName}
          </Text>
          <Text style={styles.chatHeaderSubtitle}>
            Order #{shortId} · {order.status === 'delivered' ? 'Delivered' : 'Live Delivery'}
          </Text>
        </View>

        {/* Live Indicator */}
        <View style={styles.liveBadge}>
          <View
            style={[
              styles.livePulseDot,
              { backgroundColor: isConnected ? '#00E297' : '#8C90A1' },
            ]}
          />
          <Text style={[styles.liveBadgeText, { color: isConnected ? '#00E297' : '#8C90A1' }]}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      {/* Chat Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChatContainer}>
            <View style={styles.emptyChatIconBox}>
              <MaterialIcons name="chat-bubble-outline" size={32} color="#FFE399" />
            </View>
            <Text style={styles.emptyChatTitle}>Direct Driver Chat</Text>
            <Text style={styles.emptyChatSubtitle}>
              Ask about pickup time, provide gate codes, or leave drop-off instructions.
            </Text>

            {/* Quick Prompts */}
            <View style={styles.quickPromptsContainer}>
              <Text style={styles.quickPromptsLabel}>QUICK REPLIES</Text>
              <View style={styles.quickPromptsGrid}>
                {QUICK_PROMPTS.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    onPress={() => handleSend(prompt)}
                    style={styles.quickPromptPill}
                  >
                    <Text style={styles.quickPromptText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
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

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputFieldContainer}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={`Message ${driverDisplayName.split(' ')[0]}...`}
              placeholderTextColor="#8C90A1"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={Platform.OS === 'web' ? () => handleSend() : undefined}
              style={styles.textInput}
            />
          </View>

          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!inputText.trim() || sending || !isConnected}
            style={[
              styles.sendButton,
              (!inputText.trim() || sending || !isConnected) && styles.sendButtonDisabled,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function CustomerChatScreen() {
  const [orders, setOrders] = useState<CustomerOrderData[]>(STATIC_CONVERSATIONS);
  const [activeChatOrder, setActiveChatOrder] = useState<CustomerOrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customerName, setCustomerName] = useState('Customer');

  const fetchOrders = useCallback(async () => {
    // 1. Read local cache
    let local: CustomerOrderData[] = [];
    try {
      const raw = await AsyncStorage.getItem('customer_local_orders');
      if (raw) local = JSON.parse(raw);
    } catch {}

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

  const renderConversationItem = ({ item, index }: { item: CustomerOrderData; index: number }) => {
    const shortId = item.id ? item.id.slice(-6).toUpperCase() : '------';
    const driverName = item.driverName || item.driver_name || 'Driver';
    const isDelivered = item.status === 'delivered';
    const initial = (driverName.trim() || 'D').charAt(0).toUpperCase();

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <TouchableOpacity
          onPress={() => {
            haptic();
            setActiveChatOrder(item);
          }}
          activeOpacity={0.8}
          style={styles.conversationCard}
        >
          {/* Avatar */}
          <View style={styles.convoAvatar}>
            <Text style={styles.convoAvatarText}>{initial}</Text>
          </View>

          {/* Details */}
          <View style={styles.convoDetails}>
            <View style={styles.convoTitleRow}>
              <Text style={styles.convoDriverName} numberOfLines={1}>
                {driverName}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isDelivered ? styles.statusBadgeDelivered : styles.statusBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isDelivered ? '#00E297' : '#0066FF' },
                  ]}
                >
                  {isDelivered ? 'DELIVERED' : 'ACTIVE ORDER'}
                </Text>
              </View>
            </View>

            <Text style={styles.convoSubtitle} numberOfLines={1}>
              Order #{shortId} · {item.deliveryAddress || item.delivery_address || 'Sahuarita, AZ'}
            </Text>

            <View style={styles.convoFooterRow}>
              <MaterialIcons name="chat" size={13} color="#FFE399" />
              <Text style={styles.convoTapHint}>Tap to message your driver</Text>
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={22} color="#8C90A1" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Driver Chat</Text>
            <Text style={styles.headerSubtitle}>
              Direct messages with your delivery driver
            </Text>
          </View>

          {/* Live Badge */}
          <View style={styles.liveBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
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
          ) : (
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
          )
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
    paddingTop: Platform.OS === 'ios' ? 64 : 56,
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
  headerSubtitle: {
    fontSize: 13,
    color: '#8C90A1',
    marginTop: 2,
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
