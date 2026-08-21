import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Platform,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing } from '@/constants/design';

export type SwipeSliderVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'cobalt'
  | 'amber'
  | 'emerald';

export interface SwipeSliderProps {
  title: string;
  completedTitle?: string;
  lockedTitle?: string;
  onSwipeComplete: () => void | Promise<void>;
  variant?: SwipeSliderVariant;
  icon?: keyof typeof MaterialIcons.glyphMap;
  completedIcon?: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const CONTAINER_HEIGHT = 60;
const PADDING = 5;
const THUMB_WIDTH = 76;
const THUMB_HEIGHT = CONTAINER_HEIGHT - PADDING * 2; // 50px

function ShimmerCharacter({
  char,
  index,
  total,
  shimmerAnim,
  isLocked,
}: {
  char: string;
  index: number;
  total: number;
  shimmerAnim: Animated.Value;
  isLocked?: boolean;
}) {
  if (char === ' ') {
    return <Text style={[styles.titleText, isLocked && styles.lockedText]}> </Text>;
  }

  const pos = total > 1 ? index / (total - 1) : 0;
  const p = 0.08 + pos * 0.76;
  const w = 0.12;
  const p0 = Math.max(0, p - w);
  const p1 = p;
  const p2 = Math.min(1, p + w);

  const baseOpacity = isLocked ? 0.3 : 0.38;
  const peakOpacity = isLocked ? 0.85 : 1.0;

  const inputRange: number[] = [];
  const outputRange: number[] = [];

  if (p0 > 0) {
    inputRange.push(0, p0);
    outputRange.push(baseOpacity, baseOpacity);
  } else {
    inputRange.push(0);
    outputRange.push(baseOpacity);
  }

  inputRange.push(p1);
  outputRange.push(peakOpacity);

  if (p2 < 1) {
    inputRange.push(p2, 1);
    outputRange.push(baseOpacity, baseOpacity);
  } else {
    inputRange.push(1);
    outputRange.push(baseOpacity);
  }

  const charOpacity = shimmerAnim.interpolate({
    inputRange,
    outputRange,
    extrapolate: 'clamp',
  });

  return (
    <Animated.Text
      style={[
        styles.titleText,
        isLocked && styles.lockedText,
        {
          opacity: charOpacity,
        },
      ]}
    >
      {char}
    </Animated.Text>
  );
}

function ShimmerText({
  text,
  shimmerAnim,
  isLocked,
}: {
  text: string;
  shimmerAnim: Animated.Value;
  isLocked?: boolean;
}) {
  const chars = text.split('');
  return (
    <View style={styles.textRow}>
      {chars.map((char, i) => (
        <ShimmerCharacter
          key={i}
          char={char}
          index={i}
          total={chars.length}
          shimmerAnim={shimmerAnim}
          isLocked={isLocked}
        />
      ))}
    </View>
  );
}

export function SwipeSlider({
  title,
  completedTitle = 'Complete',
  lockedTitle,
  onSwipeComplete,
  variant = 'primary',
  icon = 'arrow-forward',
  completedIcon = 'check',
  loading = false,
  disabled = false,
  style,
}: SwipeSliderProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passedThreshold, setPassedThreshold] = useState(false);

  const pan = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const passedRef = useRef(false);

  const maxSlide = Math.max(0, containerWidth - THUMB_WIDTH - PADDING * 2);

  // Sync loading prop with slide position (keep thumb at the end during loading)
  const isBusy = loading || isProcessing;
  const isLocked = disabled && !isBusy && !isCompleted;

  // Mutable refs to prevent stale closure bugs in PanResponder
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const isBusyRef = useRef(isBusy);
  isBusyRef.current = isBusy;

  const isCompletedRef = useRef(isCompleted);
  isCompletedRef.current = isCompleted;

  const maxSlideRef = useRef(maxSlide);
  maxSlideRef.current = maxSlide;

  const onSwipeCompleteRef = useRef(onSwipeComplete);
  onSwipeCompleteRef.current = onSwipeComplete;

  // Continuous left-to-right character-wave shimmer animation in all idle/before-sliding states
  useEffect(() => {
    if (isBusy || isCompleted) {
      shimmerAnim.setValue(0);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isBusy, isCompleted, shimmerAnim]);

  useEffect(() => {
    if (isBusy || isCompleted) {
      if (maxSlide > 0) {
        Animated.timing(pan, {
          toValue: maxSlide,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [isBusy, isCompleted, maxSlide]);

  // Determine variant theme colors
  const isAmber = variant === 'secondary' || variant === 'amber';
  const isEmerald = variant === 'success' || variant === 'emerald';

  const fillGradient = isEmerald
    ? (['rgba(0, 226, 151, 0.85)', 'rgba(0, 130, 85, 0.95)'] as const)
    : isAmber
    ? (['rgba(244, 195, 0, 0.85)', 'rgba(241, 193, 0, 0.95)'] as const)
    : (['rgba(0, 102, 255, 0.85)', 'rgba(0, 84, 214, 0.95)'] as const);

  const glowColor = isEmerald
    ? colors.tertiary
    : isAmber
    ? colors.secondaryContainer
    : colors.primaryContainer;

  const accentColor = isEmerald
    ? colors.tertiary
    : isAmber
    ? colors.secondary
    : colors.primary;

  const activeThumbBorder = isEmerald
    ? 'rgba(0, 226, 151, 0.45)'
    : isAmber
    ? 'rgba(244, 195, 0, 0.45)'
    : 'rgba(0, 102, 255, 0.45)';

  // Animations
  const translateBtn = pan.interpolate({
    inputRange: [0, Math.max(1, maxSlide)],
    outputRange: [0, Math.max(1, maxSlide)],
    extrapolate: 'clamp',
  });

  const fillTranslateX = pan.interpolate({
    inputRange: [0, Math.max(1, maxSlide)],
    outputRange: [-maxSlide, 0],
    extrapolate: 'clamp',
  });

  const textOpacity = pan.interpolate({
    inputRange: [0, Math.max(1, maxSlide * 0.45)],
    outputRange: [0.75, 0],
    extrapolate: 'clamp',
  });

  const translateText = pan.interpolate({
    inputRange: [0, Math.max(1, maxSlide * 0.45)],
    outputRange: [0, Math.max(1, maxSlide * 0.2)],
    extrapolate: 'clamp',
  });

  const triggerHapticLight = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
  };

  const triggerHapticMedium = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  const triggerHapticSuccess = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }
  };

  const pulseThumb = () => {
    Animated.sequence([
      Animated.timing(thumbScale, {
        toValue: 1.12,
        duration: 160,
        useNativeDriver: false,
      }),
      Animated.timing(thumbScale, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const reset = () => {
    passedRef.current = false;
    setPassedThreshold(false);
    setIsProcessing(false);
    setIsCompleted(false);
    Animated.spring(pan, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 0,
    }).start();
  };

  const completeSwipe = async () => {
    setIsProcessing(true);
    triggerHapticSuccess();

    Animated.timing(pan, {
      toValue: maxSlideRef.current,
      duration: 200,
      useNativeDriver: false,
    }).start();

    pulseThumb();

    try {
      await onSwipeCompleteRef.current();
      setIsCompleted(true);
    } catch {
      reset();
    } finally {
      setIsProcessing(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !disabledRef.current && !isBusyRef.current && !isCompletedRef.current,
      onMoveShouldSetPanResponder: (_, g) =>
        !disabledRef.current && !isBusyRef.current && !isCompletedRef.current && Math.abs(g.dx) > 2,
      onPanResponderGrant: () => {
        triggerHapticLight();
      },
      onPanResponderMove: (_, g) => {
        pan.setValue(Math.max(0, g.dx));
        const currentMax = maxSlideRef.current;
        if (currentMax <= 0) return;
        if (g.dx >= currentMax * 0.75 && !passedRef.current) {
          passedRef.current = true;
          setPassedThreshold(true);
          triggerHapticMedium();
        } else if (g.dx < currentMax * 0.75 && passedRef.current) {
          passedRef.current = false;
          setPassedThreshold(false);
        }
      },
      onPanResponderRelease: (_, g) => {
        const currentMax = maxSlideRef.current;
        if (g.vx > 1.2 || (currentMax > 0 && g.dx >= currentMax * 0.72)) {
          completeSwipe();
        } else {
          reset();
        }
      },
      onPanResponderTerminate: () => reset(),
    })
  ).current;

  const isFullTrail = isBusy || isCompleted || passedThreshold;

  return (
    <View
      style={[
        styles.container,
        isLocked && styles.containerLocked,
        isBusy && styles.containerLoading,
        isCompleted && styles.containerCompleted,
        style,
      ]}
      onLayout={(e) => {
        const width = e.nativeEvent.layout.width;
        if (width > 0 && width !== containerWidth) {
          setContainerWidth(width);
        }
      }}
    >
      {/* 1. Glowing Trail Fill Behind Thumb */}
      {!isLocked && containerWidth > 0 && (
        <Animated.View
          style={[
            styles.progressFillWrapper,
            {
              width: containerWidth,
              transform: [{ translateX: isBusy || isCompleted ? 0 : fillTranslateX }],
              shadowColor: glowColor,
              shadowOpacity: isFullTrail ? 0.75 : 0.45,
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={fillGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientFill}
          />
        </Animated.View>
      )}

      {/* 2. Text Label with Pure Letter Wave Shimmer */}
      <View style={styles.labelContainer} pointerEvents="none">
        {isBusy ? (
          <View style={styles.centerRow}>
            <ActivityIndicator color={colors.onPrimaryContainer} size="small" />
            <Text style={styles.processingText}>PROCESSING</Text>
          </View>
        ) : isCompleted ? (
          <Text style={styles.completedText}>{completedTitle}</Text>
        ) : (
          <Animated.View
            style={{
              opacity: textOpacity,
              transform: [{ translateX: translateText }],
            }}
          >
            <ShimmerText
              text={isLocked ? lockedTitle || title : title}
              shimmerAnim={shimmerAnim}
              isLocked={isLocked}
            />
          </Animated.View>
        )}
      </View>

      {/* 3. Oval Capsule Thumb Knob (76px width x 50px height) */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          {
            transform: [
              { translateX: isBusy || isCompleted ? maxSlide : translateBtn },
              { scale: thumbScale },
            ],
            borderColor: isFullTrail
              ? activeThumbBorder
              : 'rgba(255, 255, 255, 0.12)',
            backgroundColor: isLocked
              ? colors.surfaceContainer
              : colors.surfaceContainerHigh,
          },
        ]}
      >
        <MaterialIcons
          name={
            isLocked
              ? 'lock'
              : isBusy || isCompleted || passedThreshold
              ? completedIcon
              : icon
          }
          size={24}
          color={
            isLocked
              ? colors.outline
              : isBusy || isCompleted || passedThreshold
              ? colors.onSurface
              : accentColor
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CONTAINER_HEIGHT,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  containerLocked: {
    opacity: 0.55,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  containerLoading: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  containerCompleted: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  progressFillWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    elevation: 8,
  },
  gradientFill: {
    flex: 1,
    borderRadius: borderRadius.full,
  },
  labelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  lockedText: {
    color: colors.outline,
  },
  processingText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.onPrimaryContainer,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.onPrimaryContainer,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  thumb: {
    position: 'absolute',
    left: PADDING,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
});
