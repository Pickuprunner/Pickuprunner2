import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

const GOLD = '#F5C400';
const GOLD_LIGHT = '#FFE399';
const CARD_BG = '#131722';
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';

export interface EarningsHeroCardProps {
  availableCents: number;
  payingOut?: boolean;
  onInstantPayout?: () => void;
}

export function EarningsHeroCard({
  availableCents,
}: EarningsHeroCardProps) {
  const formattedBalance = (availableCents / 100).toFixed(2);

  return (
    <View style={styles.balanceCard}>
      <LinearGradient
        colors={['#181D2B', '#121520', '#0D0F17']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCardGradient}
      >
        <View style={styles.heroRow}>
          <View style={styles.coinBadge}>
            <View style={styles.coinInnerCircle}>
              <FontAwesome5 name="coins" size={28} color={GOLD} />
            </View>
          </View>

          <View style={styles.balanceMeta}>
            <Text style={styles.balanceLabel}>YOUR PAYOUTS</Text>
            <Text style={styles.balanceAmount}>${formattedBalance}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  balanceCardGradient: {
    paddingVertical: 22,
    paddingHorizontal: 22,
    width: '100%',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  coinBadge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 196, 0, 0.35)',
    backgroundColor: 'rgba(245, 196, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(245, 196, 0, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: -0.8,
  },
});
