import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, Truck } from '@blinkdotnew/mobile-ui';
import { colors } from '@/constants/design';
import { ChatMessage } from '@/lib/chat';

export interface MessageBubbleProps {
  msg: ChatMessage;
  isMine: boolean;
  role?: string;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function MessageBubble({ msg, isMine, role }: MessageBubbleProps) {
  const isCustomer = msg.role === 'customer';

  return (
    <View
      style={[
        styles.container,
        { alignItems: isMine ? 'flex-end' : 'flex-start' },
      ]}
    >
      {!isMine && (
        <View style={styles.senderLabelRow}>
          {isCustomer ? (
            <User size={12} color="rgba(194, 198, 216, 0.6)" />
          ) : (
            <Truck size={12} color="#0066FF" />
          )}
          <Text style={styles.senderLabel}>
            {isCustomer ? 'Customer' : 'Driver'} · {msg.senderName || 'User'}
          </Text>
        </View>
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
            styles.timeText,
            { alignSelf: isMine ? 'flex-end' : 'flex-start' },
          ]}
        >
          {formatTime(msg.timestamp)}
        </Text>
      </View>
    </View>
  );
}

export default MessageBubble;

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  senderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    paddingLeft: 4,
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: '#0066FF',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#181C28',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
    fontWeight: '400',
  },
  bubbleTextOther: {
    color: '#DFE2EF',
    fontWeight: '400',
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 3,
    paddingHorizontal: 2,
  },
});
