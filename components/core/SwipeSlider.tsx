import React, { useState, useRef } from 'react';
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
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing } from '@/constants/design';

export interface SwipeSliderProps {
  title: string;
  completedTitle?: string;
  onSwipeComplete: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'success';
  icon?: keyof typeof MaterialIcons.glyphMap;
  completedIcon?: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const THUMB_WIDTH = 76;
const CONTAINER_HEIGHT = 64;
const PADDING = 6;
const THUMB_HEIGHT = CONTAINER_HEIGHT - PADDING * 2; // 52px

export function SwipeSlider({
  title,
  completedTitle = 'Order Accepted',
  onSwipeComplete,
  variant = 'primary',
  icon = 'chevron-right',
  completedIcon = 'check-circle',
  loading = false,
  disabled = false,
  style,
}: SwipeSliderProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [passedThreshold, setPassedThreshold] = useState(false);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const passedRef = useRef(false);

  const maxSlide = Math.max(0, containerWidth - THUMB_WIDTH - PADDING * 2);

  const translateBtn = pan.x.interpolate({
    inputRange: [0, Math.max(1, maxSlide)],
    outputRange: [0, Math.max(1, maxSlide)],
    extrapolate: 'clamp',
  });

  const textOpacity = pan.x.interpolate({
    inputRange: [0, Math.max(1, maxSlide / 2)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const translateText = pan.x.interpolate({
    inputRange: [0, Math.max(1, maxSlide / 2)],
    outputRange: [0, Math.max(1, maxSlide / 4)],
    extrapolate: 'clamp',
  });

  const getProgressWidth = pan.x.interpolate({
    inputRange: [0, Math.max(1, maxSlide)],
    outputRange: [0, maxSlide + THUMB_WIDTH + PADDING],
    extrapolate: 'clamp',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const triggerHapticLight = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
  };

  const triggerHapticSuccess = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }
  };

  const reset = () => {
    passedRef.current = false;
    setPassedThreshold(false);
    setIsProcessing(false);
    setIsCompleted(false);
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      bounciness: 0,
    }).start();
  };

  const unlock = async () => {
    setIsProcessing(true);
    triggerHapticSuccess();

    Animated.timing(pan.x, {
      toValue: maxSlide,
      duration: 100,
      useNativeDriver: false,
    }).start();

    try {
      await onSwipeComplete();
      setIsCompleted(true);
    } catch {
      reset();
    } finally {
      setIsProcessing(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !loading && !isProcessing && !isCompleted,
      onMoveShouldSetPanResponder: (_, g) =>
        !disabled && !loading && !isProcessing && !isCompleted && Math.abs(g.dx) > 2,
      onPanResponderGrant: () => {
        triggerHapticLight();
      },
      onPanResponderMove: (_: any, g: any) => {
        pan.setValue({ x: Math.max(0, g.dx), y: 0 });
        if (maxSlide <= 0) return;
        if (g.dx >= maxSlide * 0.75 && !passedRef.current) {
          passedRef.current = true;
          setPassedThreshold(true);
          triggerHapticLight();
        } else if (g.dx < maxSlide * 0.75 && passedRef.current) {
          passedRef.current = false;
          setPassedThreshold(false);
        }
      },
      onPanResponderRelease: (_: any, g: any) => {
        if (g.vx > 1.5 || g.dx > maxSlide * 0.7) {
          unlock();
        } else {
          reset();
        }
      },
      onPanResponderTerminate: () => reset(),
    })
  ).current;

  const getPrimaryColor = () => {
    if (passedThreshold || isCompleted || isProcessing) return colors.tertiary; // #00E297
    if (variant === 'secondary') return colors.secondaryContainer; // #F4C300
    return colors.primaryContainer; // #0066FF
  };

  const showActiveLoading = loading || isProcessing;

  return (
    <View
      style={[
        styles.container,
        showActiveLoading && styles.containerLoading,
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
      {!isCompleted && !showActiveLoading && (
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: getProgressWidth,
              backgroundColor: passedThreshold
                ? 'rgba(0, 226, 151, 0.22)'
                : 'rgba(0, 102, 255, 0.22)',
            },
          ]}
        />
      )}

      <View style={styles.labelContainer} pointerEvents="none">
        {showActiveLoading ? (
          <View style={styles.centerRow}>
            <ActivityIndicator color={colors.tertiary} size="small" />
            <Text style={styles.statusText}>Processing...</Text>
          </View>
        ) : isCompleted ? (
          <View style={styles.centerRow}>
            <MaterialIcons name={completedIcon} size={22} color={colors.tertiary} />
            <Text style={styles.statusText}>{completedTitle}</Text>
          </View>
        ) : (
          <Animated.Text
            style={[
              styles.titleText,
              {
                opacity: textOpacity,
                transform: [{ translateX: translateText }],
              },
            ]}
          >
            {title}
          </Animated.Text>
        )}
      </View>

      {!isCompleted && !showActiveLoading && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.thumb,
            {
              transform: [{ translateX: translateBtn }],
              backgroundColor: getPrimaryColor(),
              shadowColor: passedThreshold ? colors.tertiary : colors.primaryContainer,
            },
          ]}
        >
          <MaterialIcons
            name={passedThreshold ? completedIcon : icon}
            size={26}
            color={passedThreshold ? colors.onTertiary : colors.onPrimaryContainer}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CONTAINER_HEIGHT,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  containerLoading: {
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderColor: 'rgba(0, 226, 151, 0.3)',
  },
  containerCompleted: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: 'rgba(0, 226, 151, 0.4)',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
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
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(223, 226, 239, 0.55)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.tertiary,
    letterSpacing: 0.6,
  },
  thumb: {
    position: 'absolute',
    left: PADDING,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});
