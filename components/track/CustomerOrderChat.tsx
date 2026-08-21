import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useOrderChat, getSavedDisplayName } from '@/lib/chat';
import { colors } from '@/constants/design';
import * as Haptics from 'expo-haptics';

export interface CustomerOrderChatProps {
  orderId: string;
  customerName: string;
}

export function CustomerOrderChat({ orderId, customerName }: CustomerOrderChatProps) {
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
    setSending(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    try {
      await sendMessage(text);
      setInputText('');
    } catch {
      // Chat send error handled
    } finally {
      setSending(false);
    }
  }, [inputText, sending, sendMessage]);

  return (
    <View style={styles.chatCard}>
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderLeft}>
          <MaterialIcons name="chat-bubble-outline" size={16} color={colors.primary} />
          <Text style={styles.chatHeaderTitle}>Direct Message with Driver</Text>
        </View>
        <View
          style={[
            styles.chatStatusDot,
            { backgroundColor: isConnected ? colors.tertiary : colors.outline },
          ]}
        />
      </View>

      <View style={styles.messageList}>
        {messages.length === 0 ? (
          <Text style={styles.emptyChatText}>
            Send a message to your driver (e.g. gate code, instructions)
          </Text>
        ) : (
          messages.slice(-4).map((msg) => {
            const isMe = msg.role === 'customer';
            return (
              <View
                key={msg.id}
                style={[
                  styles.msgRow,
                  isMe ? styles.msgRowRight : styles.msgRowLeft,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.bubbleCustomer : styles.bubbleDriver,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleSender,
                      isMe ? styles.senderCustomer : styles.senderDriver,
                    ]}
                  >
                    {isMe ? 'You' : msg.senderName || 'Driver'}
                  </Text>
                  <Text style={styles.bubbleText}>{msg.text}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.chatInput}
          placeholder="Type message to driver…"
          placeholderTextColor="rgba(194, 198, 216, 0.4)"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          style={[
            styles.sendBtn,
            inputText.trim() && !sending ? styles.sendBtnActive : styles.sendBtnDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialIcons
              name="send"
              size={16}
              color={inputText.trim() ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chatCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    backgroundColor: colors.glassLevel2Bg,
    padding: 16,
    gap: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  chatStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  messageList: {
    gap: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  emptyChatText: {
    fontSize: 12,
    color: colors.outline,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  msgRow: {
    flexDirection: 'row',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  bubbleCustomer: {
    backgroundColor: colors.primaryContainer,
  },
  bubbleDriver: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
  },
  bubbleSender: {
    fontSize: 10,
    fontWeight: '700',
  },
  senderCustomer: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  senderDriver: {
    color: colors.secondary,
  },
  bubbleText: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 17,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    paddingHorizontal: 14,
    color: colors.onSurface,
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: colors.primaryContainer,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
