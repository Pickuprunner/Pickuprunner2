import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { colors } from '@/constants/design';

export type LoadingVariant = 'circle' | 'card' | 'fullscreen' | 'inline';
export type LoadingSize = 'small' | 'medium' | 'large' | number;

export interface CustomLoadingProps {
  /** Controls visibility of the loading component */
  visible?: boolean;
  /** Display variant */
  variant?: LoadingVariant;
  /** Size preset ('small' | 'medium' | 'large') or custom number in px */
  size?: LoadingSize;
  /** Primary spinner color (defaults to gold #F4C300) */
  color?: string;
  /** Background container color override */
  backgroundColor?: string;
  /** Optional message or status text */
  text?: string;
  /** Text color override */
  textColor?: string;
  /** Whether to render as an absolute overlay */
  overlay?: boolean;
  /** Position when overlay is true ('top' | 'center') */
  position?: 'top' | 'center';
  /** Custom top offset in px when position='top' */
  topOffset?: number;
  /** Dim backdrop opacity when overlay or fullscreen is true (0 to 1) */
  backdropOpacity?: number;
  /** Enable subtle ambient shadow/glow */
  shadow?: boolean;
  /** Custom spinner component override */
  customSpinner?: React.ReactNode;
  /** Container style overrides */
  containerStyle?: StyleProp<ViewStyle>;
  /** Content wrapper style overrides */
  contentStyle?: StyleProp<ViewStyle>;
  /** Text style overrides */
  textStyle?: StyleProp<TextStyle>;
}

export function CustomLoading({
  visible = true,
  variant = 'circle',
  size = 'large',
  color = '#F4C300',
  backgroundColor = 'transparent',
  text,
  textColor = '#0F131C',
  overlay = false,
  position = 'top',
  topOffset,
  backdropOpacity = 0,
  shadow = false,
  customSpinner,
  containerStyle,
  contentStyle,
  textStyle,
}: CustomLoadingProps) {
  const [mounted, setMounted] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0.85)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]);

  if (!mounted && !visible) {
    return null;
  }

  const getIndicatorSize = (): 'small' | 'large' => {
    if (typeof size === 'number') {
      return size > 30 ? 'large' : 'small';
    }
    return size === 'small' ? 'small' : 'large';
  };

  const getBadgeDimensions = () => {
    if (typeof size === 'number') {
      return { width: size + 20, height: size + 20, borderRadius: (size + 20) / 2 };
    }
    switch (size) {
      case 'small':
        return { width: 36, height: 36, borderRadius: 18 };
      case 'large':
        return { width: 64, height: 64, borderRadius: 32 };
      case 'medium':
      default:
        return { width: 50, height: 50, borderRadius: 25 };
    }
  };

  // ─── Inline Variant ───
  if (variant === 'inline') {
    return (
      <View style={[styles.inlineContainer, containerStyle]}>
        {customSpinner || <ActivityIndicator size={getIndicatorSize()} color={color} />}
        {!!text && <Text style={[styles.inlineText, { color: textColor }, textStyle]}>{text}</Text>}
      </View>
    );
  }

  // ─── Fullscreen Variant ───
  if (variant === 'fullscreen') {
    return (
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.fullscreenOverlay,
          {
            backgroundColor: `rgba(15, 19, 28, ${backdropOpacity})`,
            opacity: fadeAnim,
          },
          containerStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.cardBadge,
            shadow && styles.badgeShadow,
            backgroundColor ? { backgroundColor } : styles.defaultCardBg,
            { transform: [{ scale: scaleAnim }] },
            contentStyle,
          ]}
        >
          {customSpinner || <ActivityIndicator size="large" color={color} />}
          {!!text && <Text style={[styles.cardText, { color: textColor }, textStyle]}>{text}</Text>}
        </Animated.View>
      </Animated.View>
    );
  }

  // ─── Card Variant ───
  if (variant === 'card') {
    const cardContent = (
      <Animated.View
        style={[
          styles.cardBadge,
          shadow && styles.badgeShadow,
          backgroundColor ? { backgroundColor } : styles.defaultCardBg,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          contentStyle,
        ]}
      >
        {customSpinner || <ActivityIndicator size={getIndicatorSize()} color={color} />}
        {!!text && <Text style={[styles.cardText, { color: textColor }, textStyle]}>{text}</Text>}
      </Animated.View>
    );

    if (overlay) {
      return (
        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[
            styles.absoluteOverlay,
            {
              backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
              opacity: fadeAnim,
            },
            containerStyle,
          ]}
        >
          {cardContent}
        </Animated.View>
      );
    }
    return <View style={containerStyle}>{cardContent}</View>;
  }

  // ─── Circle Variant (Default) ───
  const badgeDims = getBadgeDimensions();
  const circleContent = (
    <Animated.View
      style={[
        styles.circleBadge,
        badgeDims,
        shadow && styles.badgeShadow,
        backgroundColor ? { backgroundColor } : styles.defaultCircleBg,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        contentStyle,
      ]}
    >
      {customSpinner || <ActivityIndicator size={getIndicatorSize()} color={color} />}
    </Animated.View>
  );

  if (overlay) {
    const overlayStyle = position === 'top' ? styles.topOverlay : styles.absoluteOverlay;
    return (
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          overlayStyle,
          position === 'top' && typeof topOffset === 'number' && { paddingTop: topOffset },
          backdropOpacity > 0 && { backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` },
          { opacity: fadeAnim },
          containerStyle,
        ]}
      >
        {circleContent}
      </Animated.View>
    );
  }

  return (
    <View style={[styles.circleWrapper, containerStyle]}>
      {circleContent}
      {!!text && (
        <Text style={[styles.circleLabel, { color: textColor }, textStyle]}>
          {text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 8,
  },
  inlineText: {
    fontSize: 14,
    fontWeight: '500',
  },
  circleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  circleBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  defaultCircleBg: {
    backgroundColor: 'transparent',
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  defaultCardBg: {
    backgroundColor: 'rgba(23, 28, 38, 0.95)',
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
  },
  circleLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  badgeShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 250 : 235,
    zIndex: 9999,
  },
  absoluteOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
