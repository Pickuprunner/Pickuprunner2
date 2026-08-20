import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { ChevronLeft } from '@blinkdotnew/mobile-ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/design';
import { LiveBadge } from './LiveBadge';

export interface ChatHeaderProps {
  title: string;
  orderNumber?: string;
  subtitle?: string;
  isLive?: boolean;
  onBack: () => void;
}

export function ChatHeader({
  title,
  orderNumber,
  subtitle,
  isLive = true,
  onBack,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onBack();
  };

  const formattedOrderId = orderNumber
    ? orderNumber.startsWith('#')
      ? orderNumber
      : `#${orderNumber}`
    : undefined;

  const topPadding = Platform.OS === 'ios' ? Math.max(insets.top, 16) : Math.max(insets.top + 8, 16);

  return (
    <View style={[styles.headerBar, { paddingTop: topPadding }]}>
      <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
        <ChevronLeft size={24} color={colors.onSurface} />
      </Pressable>

      <View style={styles.titleCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.subRow}>
          {formattedOrderId && <Text style={styles.orderId}>{formattedOrderId}</Text>}
          {formattedOrderId && subtitle && <Text style={styles.dot}>·</Text>}
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <LiveBadge label={isLive ? 'Live' : 'Offline'} isLive={isLive} />
    </View>
  );
}

export default ChatHeader;

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#0F131C',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#DFE2EF',
    letterSpacing: -0.2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B3C5FF',
  },
  dot: {
    fontSize: 12,
    color: 'rgba(194, 198, 216, 0.4)',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(194, 198, 216, 0.7)',
    flexShrink: 1,
  },
});
