/**
 * ChatMessageBanner
 *
 * Floating in-app alert that slides in when a chat message arrives from
 * another driver while the app is open (but the chat tab isn't active).
 * Tapping navigates to the Chat tab. Auto-dismisses after 5 seconds.
 */
import React, { useEffect, useRef } from 'react';
import { Platform, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { XStack, YStack, SizableText, X, MessageCircle } from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import type { IncomingChatMessage } from '@/lib/chat';

interface Props {
  message: IncomingChatMessage | null;
  onDismiss: () => void;
}

const BANNER_HEIGHT = 88;
const AUTO_DISMISS_MS = 5000;

export default function ChatMessageBanner({ message, onDismiss }: Props) {
  const translateY = useSharedValue(-BANNER_HEIGHT - 20);
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    translateY.value = withTiming(-BANNER_HEIGHT - 20, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, (done) => {
      if (done) runOnJS(onDismiss)();
    });
  };

  useEffect(() => {
    if (!message) return;

    // Slide in from top
    translateY.value = withSpring(Platform.OS === 'web' ? 16 : 56, {
      damping: 18,
      stiffness: 200,
    });
    opacity.value = withTiming(1, { duration: 200 });

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message?.senderId, message?.text]); // re-trigger on each new message

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!message) return null;

  const preview =
    message.text.length > 60 ? message.text.slice(0, 57) + '…' : message.text;

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dismiss();
    router.push('/(tabs)/chat');
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 16,
          right: 16,
          zIndex: 9998, // just below the order banner (9999)
          borderRadius: 16,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 10,
        },
        animatedStyle,
      ]}
    >
      <Pressable onPress={handlePress} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
        <XStack
          backgroundColor="#1B3A5C"
          borderWidth={1}
          borderColor="#2563A8"
          borderRadius={16}
          padding="$4"
          alignItems="center"
          gap="$3"
        >
          {/* Icon */}
          <YStack
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor="#1E4D8C"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <MessageCircle size={20} color="#93C5FD" />
          </YStack>

          {/* Text */}
          <YStack flex={1} gap="$0.5">
            <SizableText size="$3" fontWeight="800" color="#DBEAFE">
              👤 {message.senderName}
            </SizableText>
            <SizableText size="$2" color="#93C5FD" numberOfLines={2}>
              {preview}
            </SizableText>
          </YStack>

          {/* Dismiss */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              if (timerRef.current) clearTimeout(timerRef.current);
              dismiss();
            }}
            hitSlop={12}
          >
            <X size={18} color="#93C5FD" />
          </Pressable>
        </XStack>
      </Pressable>
    </Animated.View>
  );
}
