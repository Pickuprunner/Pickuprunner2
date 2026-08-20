import React from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius as defaultRadius } from '@/constants/design';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'gold'
  | 'emerald'
  | 'gradient';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
export type ButtonShape = 'pill' | 'rounded' | 'square';

export interface CustomButtonProps {
  title?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  onPress?: (event: GestureResponderEvent) => void;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  haptic?: boolean;
  glow?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  height?: number;
  borderRadius?: number;
  accessibilityLabel?: string;
}

const DEFAULT_GRADIENT = ['#0052FF', '#0066FF', '#1A75FF'] as const;

export function CustomButton({
  title,
  children,
  variant = 'primary',
  size = 'lg',
  shape = 'pill',
  onPress,
  loading = false,
  loadingText,
  disabled = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  haptic = true,
  glow = false,
  gradientColors = DEFAULT_GRADIENT,
  style,
  contentStyle,
  textStyle,
  backgroundColor: customBg,
  textColor: customTextColor,
  borderColor: customBorderColor,
  borderWidth: customBorderWidth,
  height: customHeight,
  borderRadius: customRadius,
  accessibilityLabel,
}: CustomButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = (e: GestureResponderEvent) => {
    if (isDisabled) return;
    if (haptic && Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onPress?.(e);
  };

  const getHeight = (): number => {
    if (customHeight) return customHeight;
    switch (size) {
      case 'sm':
        return 38;
      case 'md':
        return 46;
      case 'xl':
        return 60;
      case 'lg':
      default:
        return 54;
    }
  };

  const getPaddingHorizontal = (): number => {
    switch (size) {
      case 'sm':
        return 14;
      case 'md':
        return 18;
      case 'xl':
        return 28;
      case 'lg':
      default:
        return 24;
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'sm':
        return 13.5;
      case 'md':
        return 15;
      case 'xl':
        return 17;
      case 'lg':
      default:
        return 16;
    }
  };

  const getBorderRadius = (): number => {
    if (typeof customRadius === 'number') return customRadius;
    switch (shape) {
      case 'square':
        return defaultRadius.xs;
      case 'rounded':
        return defaultRadius.DEFAULT;
      case 'pill':
      default:
        return defaultRadius.full;
    }
  };

  const getColors = () => {
    let bg = colors.primaryContainer;
    let text = colors.onPrimaryContainer;
    let border = 'transparent';
    let bWidth = 0;
    let glowColor = 'rgba(0, 102, 255, 0.45)';

    switch (variant) {
      case 'secondary':
        bg = 'rgba(255, 255, 255, 0.08)';
        text = colors.onSurface;
        border = 'rgba(255, 255, 255, 0.12)';
        bWidth = 1;
        glowColor = 'rgba(255, 255, 255, 0.1)';
        break;

      case 'outline':
        bg = 'transparent';
        text = colors.primary;
        border = colors.primaryContainer;
        bWidth = 1.5;
        glowColor = 'rgba(0, 102, 255, 0.2)';
        break;

      case 'ghost':
        bg = 'transparent';
        text = colors.onSurface;
        border = 'transparent';
        bWidth = 0;
        break;

      case 'danger':
        bg = '#DC2626';
        text = '#FFFFFF';
        border = 'transparent';
        bWidth = 0;
        glowColor = 'rgba(220, 38, 38, 0.45)';
        break;

      case 'gold':
        bg = colors.secondaryContainer;
        text = '#0F131C';
        border = 'transparent';
        bWidth = 0;
        glowColor = 'rgba(244, 195, 0, 0.45)';
        break;

      case 'emerald':
        bg = '#00E297';
        text = '#0F131C';
        border = 'transparent';
        bWidth = 0;
        glowColor = 'rgba(0, 226, 151, 0.45)';
        break;

      case 'gradient':
        bg = 'transparent';
        text = '#FFFFFF';
        border = 'transparent';
        bWidth = 0;
        glowColor = 'rgba(0, 102, 255, 0.45)';
        break;

      case 'primary':
      default:
        bg = colors.primaryContainer;
        text = colors.onPrimaryContainer;
        border = 'transparent';
        bWidth = 0;
        glowColor = 'rgba(0, 102, 255, 0.45)';
        break;
    }

    return {
      bg: customBg || bg,
      text: customTextColor || text,
      border: customBorderColor || border,
      borderWidth: customBorderWidth !== undefined ? customBorderWidth : bWidth,
      glowColor,
    };
  };

  const theme = getColors();
  const radius = getBorderRadius();
  const btnHeight = getHeight();
  const padHorizontal = getPaddingHorizontal();
  const fontSize = getFontSize();

  const glowStyle: ViewStyle | undefined = glow
    ? {
        shadowColor: theme.glowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        ...Platform.select({
          android: { elevation: 6 },
        }),
      }
    : undefined;

  const content = (
    <View style={[styles.contentRow, { gap: size === 'sm' ? 6 : 8 }, contentStyle]}>
      {loading ? (
        <>
          <ActivityIndicator size="small" color={theme.text} />
          {loadingText && (
            <Text style={[styles.text, { color: theme.text, fontSize }, textStyle]}>
              {loadingText}
            </Text>
          )}
        </>
      ) : (
        <>
          {leftIcon && <View style={styles.iconSlot}>{leftIcon}</View>}
          {title ? (
            <Text
              numberOfLines={1}
              style={[
                styles.text,
                {
                  color: theme.text,
                  fontSize,
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
          ) : (
            children
          )}
          {rightIcon && <View style={styles.iconSlot}>{rightIcon}</View>}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={({ pressed }) => [
        styles.base,
        {
          height: btnHeight,
          borderRadius: radius,
          paddingHorizontal: padHorizontal,
          backgroundColor: variant === 'gradient' ? 'transparent' : theme.bg,
          borderColor: theme.border,
          borderWidth: theme.borderWidth,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        glowStyle,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {variant === 'gradient' ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius, justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

export default CustomButton;

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
