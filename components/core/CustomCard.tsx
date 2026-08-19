import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';

export type CardVariant = 'glass' | 'solid' | 'outlined' | 'elevated' | 'transparent';

export interface CustomCardProps {
  /** Card body children */
  children?: React.ReactNode;
  /** Optional top header slot */
  header?: React.ReactNode;
  /** Optional bottom footer slot */
  footer?: React.ReactNode;
  /** Visual preset variant */
  variant?: CardVariant;
  /** Card press handler — makes card interactive when provided */
  onPress?: () => void;
  /** Disabled state when onPress is provided */
  disabled?: boolean;
  /** Active press opacity */
  activeOpacity?: number;
  /** Container style overrides */
  style?: StyleProp<ViewStyle>;
  /** Header wrapper style overrides */
  headerStyle?: StyleProp<ViewStyle>;
  /** Body content wrapper style overrides */
  bodyStyle?: StyleProp<ViewStyle>;
  /** Footer wrapper style overrides */
  footerStyle?: StyleProp<ViewStyle>;
  /** Custom border radius override (default 32) */
  borderRadius?: number;
  /** Inner padding override (default 20) */
  padding?: number;
  /** Background color override */
  backgroundColor?: string;
  /** Border color override */
  borderColor?: string;
  /** Border width override */
  borderWidth?: number;
}

/**
 * Pure, reusable UI Card container component.
 * Fully moldable with variants, custom slots, and flexible styles.
 */
export function CustomCard({
  children,
  header,
  footer,
  variant = 'glass',
  onPress,
  disabled = false,
  activeOpacity = 0.85,
  style,
  headerStyle,
  bodyStyle,
  footerStyle,
  borderRadius = 32,
  padding = 20,
  backgroundColor,
  borderColor,
  borderWidth,
}: CustomCardProps) {
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'solid':
        return {
          backgroundColor: backgroundColor || '#171C26',
          borderColor: borderColor || 'rgba(255, 255, 255, 0.08)',
          borderWidth: borderWidth ?? 1,
        };
      case 'outlined':
        return {
          backgroundColor: backgroundColor || 'transparent',
          borderColor: borderColor || 'rgba(255, 255, 255, 0.15)',
          borderWidth: borderWidth ?? 1,
        };
      case 'elevated':
        return {
          backgroundColor: backgroundColor || '#171C26',
          borderColor: borderColor || 'rgba(255, 255, 255, 0.1)',
          borderWidth: borderWidth ?? 1,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
            },
            android: {
              elevation: 6,
            },
          }),
        };
      case 'transparent':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'glass':
      default:
        return {
          backgroundColor: backgroundColor || 'rgba(255, 255, 255, 0.04)',
          borderColor: borderColor || 'rgba(255, 255, 255, 0.08)',
          borderWidth: borderWidth ?? 1,
        };
    }
  };

  const containerBaseStyle: ViewStyle = {
    borderRadius,
    padding,
    overflow: 'hidden',
    ...getVariantStyles(),
  };

  const content = (
    <>
      {header && <View style={[styles.header, headerStyle]}>{header}</View>}
      {children && <View style={[styles.body, bodyStyle]}>{children}</View>}
      {footer && <View style={[styles.footer, footerStyle]}>{footer}</View>}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        disabled={disabled}
        style={[styles.container, containerBaseStyle, style]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.container, containerBaseStyle, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    width: '100%',
  },
  body: {
    width: '100%',
  },
  footer: {
    width: '100%',
  },
});
