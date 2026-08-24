import React, { useEffect, useRef } from 'react';
import { Platform, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { XStack, YStack, SizableText, X, ShoppingBag } from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import type { NewOrderAlert } from '@/lib/realtime';

interface Props {
  alert: NewOrderAlert | null;
  onDismiss: () => void;
}

const BANNER_HEIGHT = 90;
const AUTO_DISMISS_MS = 6000;

export default function NewOrderBanner({ alert, onDismiss }: Props) {
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
    if (!alert) return;

    // Slide in
    translateY.value = withSpring(Platform.OS === 'web' ? 16 : 56, {
      damping: 18,
      stiffness: 200,
    });
    opacity.value = withTiming(1, { duration: 200 });

    // Haptic on native
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }

    // Auto-dismiss
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [alert?.orderId]); // re-run when a new alert arrives

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!alert) return null;

  const shortId = alert?.orderId ? alert.orderId.slice(-6).toUpperCase() : '------';

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dismiss();
    router.push(`/order/${alert.orderId}`);
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 16,
          right: 16,
          zIndex: 9999,
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
          backgroundColor="#1B4332"
          borderWidth={1}
          borderColor="#2D6A4F"
          borderRadius={16}
          padding="$4"
          alignItems="center"
          gap="$3"
        >
          <YStack
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor="#2D6A4F"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <ShoppingBag size={20} color="#74C69D" />
          </YStack>

          <YStack flex={1} gap="$0.5">
            <SizableText size="$4" fontWeight="800" color="#D8F3DC">
              New Order #{shortId}
            </SizableText>
            <SizableText size="$2" color="#95D5B2" numberOfLines={1}>
              {alert.customerName}
              {alert.deliveryAddress ? ` · ${alert.deliveryAddress}` : ''}
            </SizableText>
          </YStack>

          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              if (timerRef.current) clearTimeout(timerRef.current);
              dismiss();
            }}
            hitSlop={12}
          >
            <X size={18} color="#95D5B2" />
          </Pressable>
        </XStack>
      </Pressable>
    </Animated.View>
  );
}
