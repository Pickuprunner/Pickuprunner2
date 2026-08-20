import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Package } from '@blinkdotnew/mobile-ui';

const GREEN = '#00E297';
const CARD_BG = '#151924';
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';

export interface EarningsDeliveryItemProps {
  id: string;
  distanceMiles?: number;
  tipAmount?: number;
  driverEarnedCents: number;
  dateStr: string;
}

export function EarningsDeliveryItem({
  id,
  distanceMiles = 0,
  tipAmount = 0,
  driverEarnedCents,
  dateStr,
}: EarningsDeliveryItemProps) {
  const shortId = id ? id.slice(-4).toUpperCase() : '----';
  const miles = Number(distanceMiles) || 0;
  const tip = Number(tipAmount) || 0;

  return (
    <View style={styles.deliveryCard}>
      <LinearGradient
        colors={['#1B2030', '#151924', '#0F121C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.deliveryCardGradient}
      >
        <View style={styles.deliveryLeft}>
          <View style={styles.deliveryIconWrap}>
            <Package size={20} color="#D1D5DB" />
          </View>
          <View style={styles.deliveryMeta}>
            <Text style={styles.deliveryId} numberOfLines={1} ellipsizeMode="tail">
              Order #{shortId}
            </Text>
            <Text style={styles.deliverySub} numberOfLines={1} ellipsizeMode="tail">
              {dateStr} • {miles > 0 ? `${miles.toFixed(1)} mi` : 'Local'}
            </Text>
          </View>
        </View>

        <View style={styles.deliveryRight}>
          <Text style={styles.deliveryAmount} numberOfLines={1}>
            ${(driverEarnedCents / 100).toFixed(2)}
          </Text>
          <Text style={styles.deliveryTip} numberOfLines={1}>
            {tip > 0 ? `Incl. $${(tip / 100).toFixed(0)} tip` : 'Delivered ✓'}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  deliveryCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
  },
  deliveryCardGradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  deliveryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryMeta: {
    flex: 1,
  },
  deliveryId: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  deliverySub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },
  deliveryRight: {
    alignItems: 'flex-end',
  },
  deliveryAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  deliveryTip: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
