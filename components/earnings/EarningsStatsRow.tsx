import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { Clock } from '@blinkdotnew/mobile-ui';

const CARD_BG = 'rgba(255, 255, 255, 0.04)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';

function RouteIcon({ size = 15, color = '#8E9BAE' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="6" cy="19" r="3" />
      <Path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <Circle cx="18" cy="5" r="3" />
    </Svg>
  );
}

export interface EarningsStatsRowProps {
  totalMiles: number;
  activeHours: number;
  activeMinutes: number;
  hasOrders: boolean;
}

export function EarningsStatsRow({
  totalMiles,
  activeHours,
  activeMinutes,
  hasOrders,
}: EarningsStatsRowProps) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <LinearGradient
          colors={['#181C28', '#121520', '#0C0E16']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.statCardGradient}
        >
          <View style={styles.statHeader}>
            <RouteIcon size={14} color="#8E9BAE" />
            <Text style={styles.statLabel}>Total Miles</Text>
          </View>
          <Text style={styles.statValue}>
            {totalMiles > 0 ? `${totalMiles.toFixed(1)} mi` : '0.0 mi'}
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.statCard}>
        <LinearGradient
          colors={['#181C28', '#121520', '#0C0E16']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.statCardGradient}
        >
          <View style={styles.statHeader}>
            <Clock size={14} color="#8E9BAE" />
            <Text style={styles.statLabel}>Active Time</Text>
          </View>
          <Text style={styles.statValue}>
            {hasOrders ? `${activeHours}h ${activeMinutes}m` : '0h 00m'}
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardGradient: {
    padding: 16,
    width: '100%',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    color: '#8E9BAE',
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
});
