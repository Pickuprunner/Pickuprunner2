import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const BLUE = '#0066FF';
const GOLD = '#F5C400';
const CARD_BG = '#151924';
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';

function BanknoteIcon({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="6" width="20" height="12" rx="2" />
      <Circle cx="12" cy="12" r="2" />
      <Path d="M6 12h.01M18 12h.01" />
    </Svg>
  );
}

export interface EarningsHeroCardProps {
  availableCents: number;
  payingOut: boolean;
  onInstantPayout: () => void;
}

export function EarningsHeroCard({
  availableCents,
  payingOut,
  onInstantPayout,
}: EarningsHeroCardProps) {
  const formattedBalance = (availableCents / 100).toFixed(2);

  return (
    <View style={styles.balanceCard}>
      <LinearGradient
        colors={['#1B2030', '#151924', '#0F121C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.balanceCardGradient}
      >
        <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
        <Text style={styles.balanceAmount}>${formattedBalance}</Text>

        <Pressable
          onPress={onInstantPayout}
          disabled={payingOut}
          style={({ pressed }) => [
            styles.payoutButton,
            pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
            availableCents < 100 && { opacity: 0.65 },
          ]}
        >
          {payingOut ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <BanknoteIcon size={18} color="white" />
              <Text style={styles.payoutButtonText}>Instant Payout</Text>
            </>
          )}
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  balanceCardGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  balanceLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: -1,
    marginBottom: 20,
  },
  payoutButton: {
    backgroundColor: BLUE,
    borderRadius: 9999,
    height: 50,
    paddingHorizontal: 24,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  payoutButtonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
  },
});
