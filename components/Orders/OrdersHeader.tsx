import React from 'react';
import { View, Text, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomHeader } from '@/components/core';
import { colors } from '@/constants/design';
import { MAX_QUEUE } from '@/lib/driverQueue';

interface Props {
  pendingCount: number;
  queueCount: number;
  atCapacity: boolean;
  isConnected: boolean;
  search?: string;
  onSearchChange?: (text: string) => void;
  showSearch?: boolean;
  onFilterPress?: () => void;
  showAvatar?: boolean;
  avatar?: string;
  onAvatarPress?: () => void;
  sticky?: boolean;
  translateY?: Animated.Value | Animated.AnimatedInterpolation<number>;
  animatedOpacity?: Animated.Value | Animated.AnimatedInterpolation<number>;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export function OrdersHeader({
  pendingCount,
  queueCount,
  atCapacity,
  isConnected,
  search = '',
  onSearchChange,
  showSearch = false,
  onFilterPress,
  showAvatar = true,
  avatar = 'D',
  onAvatarPress,
  sticky = false,
  translateY,
  animatedOpacity,
  onLayout,
}: Props) {
  const pills = (
    <>
      {/* My Queue Pill */}
      <View style={[styles.pill, atCapacity && styles.pillCapacity]}>
        <MaterialIcons name="inventory-2" size={15} color={colors.onSurfaceVariant} />
        <Text style={styles.pillText}>
          My Queue {queueCount}/{MAX_QUEUE}
        </Text>
      </View>

      {/* Live Status Pill */}
      <View style={[styles.pill, isConnected ? styles.pillLive : styles.pillOffline]}>
        <View style={[styles.liveDot, !isConnected && styles.offlineDot]} />
        <Text style={[styles.pillText, isConnected ? styles.pillLiveText : styles.pillOfflineText]}>
          {isConnected ? 'Live' : 'Offline'}
        </Text>
      </View>
    </>
  );

  return (
    <CustomHeader
      title="Orders"
      subtitle="pending • Tap Accept to grab orders"
      highlightText={pendingCount}
      showAvatar={showAvatar}
      avatar={avatar}
      onAvatarPress={onAvatarPress}
      pills={pills}
      showSearch={showSearch}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search by name, phone, address..."
      showFilter={showSearch}
      onFilterPress={onFilterPress}
      sticky={sticky}
      translateY={translateY}
      animatedOpacity={animatedOpacity}
      onLayout={onLayout}
    />
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pillCapacity: {
    borderColor: 'rgba(249, 115, 22, 0.4)',
  },
  pillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#DFE2EF',
  },
  pillLive: {
    backgroundColor: 'rgba(0, 226, 151, 0.10)',
    borderColor: 'rgba(0, 226, 151, 0.30)',
  },
  pillLiveText: {
    color: '#00E297',
    fontWeight: '600',
  },
  pillOffline: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillOfflineText: {
    color: '#8C90A1',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#00E297',
  },
  offlineDot: {
    backgroundColor: '#8C90A1',
  },
});
