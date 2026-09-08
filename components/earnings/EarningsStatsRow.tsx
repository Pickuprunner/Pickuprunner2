import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const CARD_BG = '#131722';
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';

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
          colors={['#1A1F2C', '#131622']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <View style={styles.cardContentRow}>
            <View style={[styles.circleIconWrap, styles.blueCircle]}>
              <MaterialIcons name="place" size={18} color="#B3C5FF" />
            </View>
            <View style={styles.statMeta}>
              <Text style={styles.statLabel}>Total Miles</Text>
              <Text style={styles.statValue}>
                {totalMiles > 0 ? `${totalMiles.toFixed(1)} mi` : '0.0 mi'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.statCard}>
        <LinearGradient
          colors={['#1A1F2C', '#131622']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <View style={styles.cardContentRow}>
            <View style={[styles.circleIconWrap, styles.mintCircle]}>
              <MaterialIcons name="access-time" size={18} color="#00E297" />
            </View>
            <View style={styles.statMeta}>
              <Text style={styles.statLabel}>Active Time</Text>
              <Text style={styles.statValue}>
                {hasOrders ? `${activeHours}h ${activeMinutes}m` : '0h 00m'}
              </Text>
            </View>
          </View>
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardGradient: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    width: '100%',
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueCircle: {
    backgroundColor: 'rgba(0, 102, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(179, 197, 255, 0.25)',
  },
  mintCircle: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.25)',
  },
  statMeta: {
    flex: 1,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
