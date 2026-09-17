import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { AlertTriangle } from '@blinkdotnew/mobile-ui';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/constants/design';

export const sessionDismissedPops = new Set<string>();

export function clearSessionDismissedPops() {
  sessionDismissedPops.clear();
}

export interface CustomPopProps {
  id?: string;
  visible?: boolean;
  message?: string;
  warning?: { message: string; document?: string; daysLeft?: number | null };
  type?: 'warning' | 'error' | 'info' | 'success';
  actionLabel?: string;
  closable?: boolean;
  onAction?: () => void;
  onPress?: () => void;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function CustomPop({
  id,
  visible = true,
  message,
  warning,
  type = 'warning',
  actionLabel = 'Renew',
  closable = true,
  onAction,
  onPress,
  onClose,
  style,
}: CustomPopProps) {
  const popKey = id || (warning?.document ? `doc_${warning.document}` : message) || 'custom_pop_default';
  const [dismissed, setDismissed] = useState(() => sessionDismissedPops.has(popKey));

  if (!visible || dismissed || sessionDismissedPops.has(popKey)) return null;

  const displayMessage = warning?.message || message || '';

  const isExpired =
    type === 'error' ||
    warning?.daysLeft === 0 ||
    warning?.message?.toLowerCase().includes('expired') ||
    message?.toLowerCase().includes('expired');

  const effectiveType = isExpired ? 'error' : type;

  const getThemedColors = () => {
    switch (effectiveType) {
      case 'error':
        return {
          accent: '#FFC2BA',
          btnBg: '#FFA89E',
          btnText: '#0F131C',
          bg: 'rgba(255, 84, 73, 0.13)',
          border: 'rgba(255, 84, 73, 0.42)',
          iconBg: 'rgba(255, 84, 73, 0.20)',
        };
      case 'success':
        return {
          accent: colors.tertiary,
          btnBg: colors.tertiary,
          btnText: colors.background,
          bg: colors.greenAlpha10,
          border: colors.greenAlpha30,
          iconBg: colors.greenAlpha15,
        };
      case 'info':
        return {
          accent: colors.primary,
          btnBg: colors.primaryContainer,
          btnText: '#FFFFFF',
          bg: colors.primaryAlpha12,
          border: colors.primaryAlpha30,
          iconBg: colors.primaryAlpha20,
        };
      case 'warning':
      default:
        return {
          accent: colors.secondary,
          btnBg: colors.secondaryContainer,
          btnText: colors.background,
          bg: colors.accentAlpha12,
          border: colors.accentAlpha30,
          iconBg: colors.accentAlpha15,
        };
    }
  };

  const theme = getThemedColors();
  const handlePress = onPress || onAction;

  const handleClose = () => {
    sessionDismissedPops.add(popKey);
    setDismissed(true);
    if (onClose) onClose();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[
        styles.expiringBanner,
        { backgroundColor: theme.bg, borderColor: theme.border },
        style,
      ]}
    >
      <View style={styles.expiringBannerLeft}>
        <View style={[styles.iconCircle, { backgroundColor: theme.iconBg, borderColor: theme.border }]}>
          <AlertTriangle size={15} color={theme.accent} />
        </View>
        <Text style={[styles.expiringBannerText, { color: theme.accent }]}>
          {displayMessage}
        </Text>
      </View>

      {!!actionLabel && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation();
            if (handlePress) handlePress();
          }}
          style={[styles.expiringBannerBtn, { backgroundColor: theme.btnBg }]}
        >
          <Text style={[styles.expiringBannerBtnText, { color: theme.btnText }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}

      {closable && (
        <TouchableOpacity
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          style={[styles.closeBtn, { borderColor: theme.border }]}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <MaterialIcons name="close" size={12} color={theme.accent} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default CustomPop;

const styles = StyleSheet.create({
  expiringBanner: {
    position: 'relative',
    overflow: 'visible',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 12,
    ...shadows.sm,
  },
  expiringBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiringBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.15,
  },
  expiringBannerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  expiringBannerBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerLowest || '#0A0E17',
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});
