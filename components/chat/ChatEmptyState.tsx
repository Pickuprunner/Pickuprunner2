import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MessageCircle } from '@blinkdotnew/mobile-ui';
import { colors } from '@/constants/design';

export interface ChatEmptyStateProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  buttonText?: string;
  buttonIcon?: React.ReactNode;
  onButtonPress?: () => void;
}

export function ChatEmptyState({
  title = 'No Messages Yet',
  subtitle = 'Conversations with your driver or customer will appear here.',
  icon,
  buttonText,
  buttonIcon,
  onButtonPress,
}: ChatEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        {icon || <MessageCircle size={32} color="rgba(255, 255, 255, 0.4)" />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {buttonText && onButtonPress && (
        <Pressable
          onPress={onButtonPress}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          {buttonIcon}
          <Text style={styles.buttonText}>{buttonText}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default ChatEmptyState;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#181C28',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 20,
    marginTop: 12,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
