import React, { useEffect, useRef } from 'react';
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
  /** Display variant:
   *  - `circle`: Floating circular badge with spinner (matching design screenshot)
   *  - `card`: Rounded floating container with spinner and optional text
   *  - `fullscreen`: Centered overlay taking up full screen with dimmed backdrop
   *  - `inline`: Minimal lightweight inline spinner
   */
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
  /** Whether to render as an absolute centered overlay */
  overlay?: boolean;
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
  size = 'medium',
  color = colors.secondaryContainer || '#F4C300',
  backgroundColor,
  text,
  textColor = '#DFE2EF',
  overlay = false,
  backdropOpacity = 0.5,
  shadow = true,
  customSpinner,
  containerStyle,
  contentStyle,
  textStyle,
}: CustomLoadingProps) {
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: visible ? 1 : 0.85,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  if (!visible && (fadeAnim as any)._value === 0) {
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
        return { width: 48, height: 48, borderRadius: 24 };
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
        <View
          style={[
            styles.absoluteOverlay,
            { backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` },
            containerStyle,
          ]}
        >
          {cardContent}
        </View>
      );
    }
    return <View style={containerStyle}>{cardContent}</View>;
  }

  // ─── Circle Variant (Default - Matching Screenshot) ───
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
    return (
      <View
        style={[
          styles.absoluteOverlay,
          { backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` },
          containerStyle,
        ]}
      >
        {circleContent}
      </View>
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  defaultCircleBg: {
    backgroundColor: '#FFFFFF',
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
