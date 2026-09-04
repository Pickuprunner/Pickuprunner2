import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CustomHeader } from '@/components/core';

interface Props {
  greetingText: string;
  activeCount: number;
  isConnected?: boolean;
  showAvatar?: boolean;
  avatar?: string;
  avatarUrl?: string | null;
  onAvatarPress?: () => void;
}

export function MyOrdersHeader({
  greetingText,
  activeCount,
  isConnected = true,
  showAvatar = true,
  avatar = 'D',
  avatarUrl,
  onAvatarPress,
}: Props) {
  const subtitleHighlight = isConnected ? 'Online • In Service' : 'Connecting…';

  return (
    <CustomHeader
      title="My Orders"
      subtitle={greetingText}
      subtitleHighlight={subtitleHighlight}
      showAvatar={showAvatar}
      avatar={avatar}
      avatarUrl={avatarUrl}
      onAvatarPress={onAvatarPress}
      rightContent={
        <View style={styles.rightPills}>
          {activeCount > 0 && (
            <View style={styles.activePill}>
              <View style={[styles.statusDot, isConnected && styles.statusDotOnline]} />
              <Text style={styles.activePillText}>{activeCount} ACTIVE</Text>
            </View>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  rightPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
  },
  activePillText: {
    color: '#00E297',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8C90A1',
  },
  statusDotOnline: {
    backgroundColor: '#00E297',
  },
});
