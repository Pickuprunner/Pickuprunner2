import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CustomHeader } from '@/components/core';

interface Props {
  greetingText: string;
  activeCount: number;
  isConnected?: boolean;
  showAvatar?: boolean;
  avatar?: string;
  onAvatarPress?: () => void;
}

export function MyOrdersHeader({
  greetingText,
  activeCount,
  isConnected = true,
  showAvatar = true,
  avatar = 'D',
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
      onAvatarPress={onAvatarPress}
      rightContent={
        <View style={styles.rightPills}>
          {activeCount > 0 && (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{activeCount} ACTIVE</Text>
            </View>
          )}
          <View style={[styles.statusDot, isConnected && styles.statusDotOnline]} />
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8C90A1',
  },
  statusDotOnline: {
    backgroundColor: '#00E297',
  },
});
