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
} from 'react-native';
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  Spinner,
  MessageCircle,
  Send,
  Wifi,
  WifiOff,
  Package,
  ChevronRight,
  ChevronLeft,
  Truck,
} from '@blinkdotnew/mobile-ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useOrders, Order } from '@/lib/orders';
import { useOrderChat, getSavedDisplayName, saveDisplayName, ChatMessage } from '@/lib/chat';
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

  const { messages, isConnected, sendMessage } = useOrderChat({
    orderId: order.id,
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
    if (!text || sending) return;
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
  }, [inputText, sending, sendMessage]);

  const listItems = React.useMemo(() => {
    const items: ({ type: 'date'; ts: number; key: string } | { type: 'message'; msg: ChatMessage; isMine: boolean; key: string })[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const dateStr = new Date(msg.timestamp).toDateString();
      if (dateStr !== lastDate) {
        items.push({ type: 'date', ts: msg.timestamp, key: `date-${msg.timestamp}` });
        lastDate = dateStr;
      }
      const isMine = msg.role === 'driver';
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
        isLive={isConnected}
        onBack={onBack}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
      </KeyboardAvoidingView>
    </View>
  );
}


type ListItem =
  | { type: 'date'; ts: number; key: string }
  | { type: 'message'; msg: ChatMessage; isMine: boolean; key: string };

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [nameReady, setNameReady] = useState(false);
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading } = useOrders();
  const driverId = useDriverId();

  const activeOrders = orders.filter(
    (o) => o.driverUserId === driverId && (o.status === 'accepted' || o.status === 'picked_up')
  );

  const recentOrders = orders.filter(
    (o) => o.driverUserId === driverId && o.status === 'delivered'
  );

  useEffect(() => {
    getSavedDisplayName().then((name) => {
      setDisplayName(name || null);
      setNameReady(true);
    });
  }, []);

  const handleSetName = useCallback(async (name: string) => {
    await saveDisplayName(name);
    setDisplayName(name);
  }, []);

  if (!nameReady) {
    return (
      <SafeArea>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$color9" />
        </YStack>
      </SafeArea>
    );
  }

  // Handle hardware/gesture back press when in individual chat view
  useEffect(() => {
    if (!activeChatOrder) return;
    const onBackPress = () => {
      setActiveChatOrder(null);
      return true; // prevent navigating away from screen
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [activeChatOrder]);

  if (!displayName) {
    return <SafeArea><NameSetupPrompt onSet={handleSetName} /></SafeArea>;
  }
  if (activeChatOrder) {
    return <OrderChatView order={activeChatOrder} displayName={displayName} onBack={() => setActiveChatOrder(null)} />;
  }

  const mapToChatItem = (item: Order): ChatConversationItem => {
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

  return (
    <View style={styles.root}>
      <View style={[styles.appHeader, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSubtitleRow}>
          <Text style={styles.headerSubtitle}>
            {activeOrders.length > 0
              ? `${activeOrders.length} active conversation${activeOrders.length > 1 ? 's' : ''}`
              : 'No active deliveries'}
          </Text>
          <Text style={styles.headerDot}>·</Text>
          <Text style={styles.headerStatusText}>All read</Text>
        </View>
      </View>

      {isLoading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$color9" />
        </YStack>
      ) : activeOrders.length === 0 && recentOrders.length === 0 ? (
        <ChatEmptyState
          title="No Active Deliveries"
          subtitle="Accept an order from the feed to start messaging your customer."
          buttonText="Browse Orders"
          buttonIcon={<Truck size={16} color="white" />}
          onButtonPress={() => router.push('/(tabs)')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {activeOrders.length > 0 && (
            <>
              <ChatSectionHeader title="Active Orders" count={activeOrders.length} />
              {activeOrders.map((item) => (
                <ConversationCard
                  key={item.id}
                  item={mapToChatItem(item)}
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
                  item={mapToChatItem(item)}
                  role="driver"
                  onPress={() => setActiveChatOrder(item)}
                />
              ))}
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
});
