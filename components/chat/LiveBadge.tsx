import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface LiveBadgeProps {
  label?: string;
  isLive?: boolean;
}

export function LiveBadge({ label = 'Live', isLive = true }: LiveBadgeProps) {
  return (
    <View style={[styles.pill, !isLive && styles.pillOffline]}>
      <View style={[styles.dot, !isLive && styles.dotOffline]} />
      <Text style={[styles.text, !isLive && styles.textOffline]}>{label}</Text>
    </View>
  );
}

export default LiveBadge;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 226, 151, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.28)',
  },
  pillOffline: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00E297',
    shadowColor: '#00E297',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  dotOffline: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    shadowOpacity: 0,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#00E297',
    textTransform: 'uppercase',
  },
  textOffline: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
