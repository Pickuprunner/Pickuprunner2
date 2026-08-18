import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
  StyleSheet,
  View,
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
import * as Haptics from 'expo-haptics';
import { useOrders, Order } from '@/lib/orders';
import { useOrderChat, getSavedDisplayName, saveDisplayName, ChatMessage } from '@/lib/chat';
import { useDriverId } from '@/hooks/useDriverId';
import { colors, spacing, borderRadius } from '@/constants/design';

// ── helpers ──────────────────────────────────────────────────────────────────

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

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isMine,
}: {
  msg: ChatMessage;
  isMine: boolean;
}) {
  const isCustomer = msg.role === 'customer';
  return (
    <YStack
      alignItems={isMine ? 'flex-end' : 'flex-start'}
      marginBottom="$2"
      paddingHorizontal="$4"
    >
      {/* Sender label */}
      {!isMine && (
        <SizableText size="$1" fontWeight="700" color="$color10" paddingLeft="$1" marginBottom="$1">
          {isCustomer ? '👤 Customer' : '🚚 Driver'} — {msg.senderName}
        </SizableText>
      )}

      <YStack maxWidth="75%">
        <YStack
          backgroundColor={isMine ? '#2D6A4F' : '$color3'}
          borderRadius={18}
          borderBottomRightRadius={isMine ? 4 : 18}
          borderBottomLeftRadius={isMine ? 18 : 4}
          paddingHorizontal="$3"
          paddingVertical="$2"
        >
          <SizableText size="$3" color={isMine ? 'white' : '$color12'} lineHeight={20}>
            {msg.text}
          </SizableText>
        </YStack>

        <SizableText size="$1" color="$color9" alignSelf={isMine ? 'flex-end' : 'flex-start'} paddingHorizontal="$1">
          {formatTime(msg.timestamp)}
        </SizableText>
      </YStack>
    </YStack>
  );
}

// ── Date separator ────────────────────────────────────────────────────────────

function DateSeparator({ ts }: { ts: number }) {
  return (
    <XStack alignItems="center" space="$2" paddingHorizontal="$4" marginVertical="$3">
      <YStack flex={1} height={1} backgroundColor="$color4" />
      <SizableText size="$1" color="$color9" fontWeight="600">{formatDate(ts)}</SizableText>
      <YStack flex={1} height={1} backgroundColor="$color4" />
    </XStack>
  );
}

// ── Name setup prompt ────────────────────────────────────────────────────────

function NameSetupPrompt({ onSet }: { onSet: (name: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" space="$4">
      <YStack width={72} height={72} borderRadius={36} backgroundColor="$color3" alignItems="center" justifyContent="center">
        <MessageCircle size={36} color="$color9" />
      </YStack>
      <YStack alignItems="center" space="$1">
        <SizableText size="$6" fontWeight="800" color="$color12">Set Your Name</SizableText>
        <SizableText size="$3" color="$color10" textAlign="center">
          Customers will see this name when you message them.
        </SizableText>
      </YStack>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Your name (e.g. Alex)"
        placeholderTextColor={colors.textTertiary}
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

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText('');
    setSending(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await sendMessage(text);
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, sendMessage]);

  // Build list items with date separators
  const listItems = React.useMemo(() => {
    const items: { type: 'date'; ts: number; key: string } | { type: 'message'; msg: ChatMessage; isMine: boolean; key: string }[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const dateStr = new Date(msg.timestamp).toDateString();
      if (dateStr !== lastDate) {
        (items as any[]).push({ type: 'date', ts: msg.timestamp, key: `date-${msg.timestamp}` });
        lastDate = dateStr;
      }
      const isMine = msg.role === 'driver';
      (items as any[]).push({ type: 'message', msg, isMine, key: msg.id });
    }
    return items;
  }, [messages]);

  return (
    <SafeArea flex={1}>
      {/* Header */}
      <XStack
        paddingHorizontal="$4" paddingTop="$3" paddingBottom="$3"
        alignItems="center" space="$3"
        borderBottomWidth={1} borderBottomColor="$color4"
      >
        <Pressable onPress={onBack} hitSlop={8}>
          <ChevronLeft size={24} color="$color10" />
        </Pressable>
        <YStack flex={1}>
          <SizableText size="$5" fontWeight="800" color="$color12">
            {order.customerName}
          </SizableText>
          <SizableText size="$2" color="$color9">
            Order #{shortId} · {order.deliveryAddress?.slice(0, 30) || 'No address'}
          </SizableText>
        </YStack>
        <XStack space="$1" alignItems="center" paddingHorizontal="$2" paddingVertical="$1" borderRadius="$full"
          backgroundColor={isConnected ? '$green3' : '$color3'} borderWidth={1}
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

      {/* Messages */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {messages.length === 0 ? (
          <YStack flex={1} alignItems="center" justifyContent="center" space="$3" padding="$6">
            <YStack width={56} height={56} borderRadius={28} backgroundColor="$color3" alignItems="center" justifyContent="center">
              <MessageCircle size={28} color="$color8" />
            </YStack>
            <SizableText size="$4" fontWeight="700" color="$color12">No messages yet</SizableText>
            <SizableText size="$3" color="$color10" textAlign="center">
              Message your customer about this delivery.
            </SizableText>
          </YStack>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listItems as any[]}
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

        {/* Input bar */}
        <XStack paddingHorizontal="$3" paddingVertical="$3" space="$2" alignItems="flex-end"
          borderTopWidth={1} borderTopColor="$color4" backgroundColor="$background"
        >
          <YStack flex={1} backgroundColor="$color3" borderRadius={22} paddingHorizontal="$4" paddingVertical="$2" minHeight={44} justifyContent="center">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={`Message ${order.customerName?.split(' ')[0] || 'customer'}…`}
              placeholderTextColor={colors.textTertiary}
              multiline maxLength={500} returnKeyType="send" blurOnSubmit={false}
              onSubmitEditing={Platform.OS === 'web' ? handleSend : undefined}
              style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]}
            />
          </YStack>
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || sending || !isConnected}
            style={({ pressed }) => [
              styles.sendBtn,
              (!inputText.trim() || sending || !isConnected) && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}
          >
            {sending ? <Spinner size="small" color="white" /> : <Send size={18} color="white" />}
          </Pressable>
        </XStack>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

// ── Order list view ──────────────────────────────────────────────────────────

type ListItem =
  | { type: 'date'; ts: number; key: string }
  | { type: 'message'; msg: ChatMessage; isMine: boolean; key: string };

export default function ChatScreen() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [nameReady, setNameReady] = useState(false);
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading } = useOrders();
  const driverId = useDriverId();

  // Active orders for this driver (accepted or picked_up)
  const activeOrders = orders.filter(
    (o) => o.driverUserId === driverId && (o.status === 'accepted' || o.status === 'picked_up')
  );

  // Load saved name
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

  // Loading
  if (!nameReady) {
    return (
      <SafeArea>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$color9" />
        </YStack>
      </SafeArea>
    );
  }

  // Name setup
  if (!displayName) {
    return <SafeArea><NameSetupPrompt onSet={handleSetName} /></SafeArea>;
  }

  // Show per-order chat
  if (activeChatOrder) {
    return <OrderChatView order={activeChatOrder} displayName={displayName} onBack={() => setActiveChatOrder(null)} />;
  }

  // ── Order list ──────────────────────────────────────────────────────────
  return (
    <SafeArea>
      <XStack
        paddingHorizontal="$4" paddingTop="$4" paddingBottom="$3"
        alignItems="center" justifyContent="space-between"
        borderBottomWidth={1} borderBottomColor="$color4"
      >
        <YStack>
          <SizableText size="$6" fontWeight="800" color="$color12">Messages</SizableText>
          <SizableText size="$2" color="$color10">
            {activeOrders.length > 0 ? `${activeOrders.length} active conversation${activeOrders.length > 1 ? 's' : ''}` : 'No active deliveries'}
          </SizableText>
        </YStack>
      </XStack>

      {isLoading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$color9" />
        </YStack>
      ) : activeOrders.length === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center" space="$3" padding="$6">
          <YStack width={64} height={64} borderRadius={32} backgroundColor="$color3" alignItems="center" justifyContent="center">
            <MessageCircle size={32} color="$color8" />
          </YStack>
          <YStack alignItems="center" space="$1">
            <SizableText size="$5" fontWeight="700" color="$color12">No Active Deliveries</SizableText>
            <SizableText size="$3" color="$color10" textAlign="center">
              Accept an order to start messaging your customer.
            </SizableText>
          </YStack>
          <Pressable
            onPress={() => router.push('/(tabs)')}
            style={({ pressed }) => [styles.gotoBtn, pressed && styles.gotoBtnPressed]}
          >
            <Truck size={16} color="white" />
            <SizableText size="$3" fontWeight="700" color="white">Browse Orders</SizableText>
          </Pressable>
        </YStack>
      ) : (
        <FlatList
          data={activeOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const shortId = item?.id ? item.id.slice(-6).toUpperCase() : '------';
            const miles = Number(item.distanceMiles ?? 0);
            return (
              <Pressable
                onPress={() => setActiveChatOrder(item)}
                style={({ pressed }) => [styles.orderCard, pressed && styles.orderCardPressed]}
              >
                <XStack alignItems="center" space="$3">
                  <YStack
                    width={44} height={44} borderRadius={22}
                    backgroundColor={item.status === 'accepted' ? 'rgba(0,102,255,0.15)' : 'rgba(249,115,22,0.15)'}
                    alignItems="center" justifyContent="center"
                  >
                    <MessageCircle size={20} color={item.status === 'accepted' ? '#60A5FA' : '#FB923C'} />
                  </YStack>
                  <YStack flex={1}>
                    <XStack justifyContent="space-between" alignItems="center">
                      <SizableText size="$4" fontWeight="700" color="$color12">
                        {item.customerName}
                      </SizableText>
                      <SizableText size="$1" color="$color9">#{shortId}</SizableText>
                    </XStack>
                    <SizableText size="$2" color="$color10" numberOfLines={1}>
                      {item.deliveryAddress || 'No address'}
                    </SizableText>
                    <XStack space="$2" alignItems="center" marginTop="$1">
                      <YStack
                        paddingHorizontal="$2" paddingVertical="$0.5"
                        borderRadius="$full"
                        backgroundColor={item.status === 'accepted' ? 'rgba(0,102,255,0.12)' : 'rgba(249,115,22,0.12)'}
                      >
                        <SizableText size="$1" fontWeight="700" color={item.status === 'accepted' ? '#60A5FA' : '#FB923C'}>
                          {item.status === 'accepted' ? 'HEADING TO PICKUP' : 'DELIVERING'}
                        </SizableText>
                      </YStack>
                      {miles > 0 && (
                        <SizableText size="$1" color="$color9">{miles.toFixed(1)} mi</SizableText>
                      )}
                    </XStack>
                  </YStack>
                  <ChevronRight size={18} color="$color8" />
                </XStack>
              </Pressable>
            );
          }}
        />
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 15,
    color: colors.text,
    maxHeight: 120,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  nameInput: {
    width: '100%',
    height: 52,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameBtn: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBtnDisabled: {
    opacity: 0.4,
  },
  gotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: '#0066FF',
  },
  gotoBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  orderCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  orderCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
