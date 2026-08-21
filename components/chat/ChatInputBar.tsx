import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/design';

export interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  accentColor?: string;
  quickPrompts?: string[];
  onSelectPrompt?: (prompt: string) => void;
}

export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  sending = false,
  disabled = false,
  placeholder = 'Type a message…',
  accentColor = colors.primaryContainer,
  quickPrompts,
  onSelectPrompt,
}: ChatInputBarProps) {
  const canSend = value.trim().length > 0 && !sending && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    }
    onSend();
  };

  const handlePromptPress = (prompt: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
    } else {
      onChangeText(prompt);
    }
  };

  return (
    <View style={styles.outerContainer}>
      {quickPrompts && quickPrompts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promptsList}
        >
          {quickPrompts.map((prompt) => (
            <Pressable
              key={prompt}
              onPress={() => handlePromptPress(prompt)}
              style={({ pressed }) => [
                styles.promptPill,
                pressed && styles.promptPillPressed,
              ]}
            >
              <Text style={styles.promptText}>{prompt}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={styles.container}>
        <View style={styles.inputWrapper}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="rgba(194, 198, 216, 0.45)"
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={Platform.OS === 'web' ? handleSend : undefined}
            style={[
              styles.input,
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
            ]}
          />
        </View>

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: accentColor },
            !canSend && styles.sendBtnDisabled,
            pressed && styles.sendBtnPressed,
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default ChatInputBar;

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.glassLevel2Border,
    paddingBottom: 4,
  },
  promptsList: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  promptPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
  },
  promptPillPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  promptText: {
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: '500',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 42,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14.5,
    color: colors.onSurface,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  sendBtnPressed: {
    transform: [{ scale: 0.94 }],
  },
});
