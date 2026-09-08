import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const GREEN = '#00E297';
const CARD_BG = '#131722';
const CARD_BORDER = 'rgba(255, 255, 255, 0.07)';

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
        colors={['#191E2A', '#131622']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.deliveryCardGradient}
      >
        <View style={styles.deliveryLeft}>
          <View style={styles.deliveryIconWrap}>
            <MaterialIcons name="inventory-2" size={20} color="#DFE2EF" />
          </View>
          <View style={styles.deliveryMeta}>
            <Text style={styles.deliveryId} numberOfLines={1} ellipsizeMode="tail">
              Order #{shortId}
            </Text>
            <Text style={styles.deliverySub} numberOfLines={1} ellipsizeMode="tail">
              {dateStr}
            </Text>
          </View>
        </View>

        <View style={styles.deliveryRight}>
          <View style={styles.amountCol}>
            <Text style={styles.deliveryAmount} numberOfLines={1}>
              ${(driverEarnedCents / 100).toFixed(2)}
            </Text>
            {tip > 0 ? (
              <View style={styles.tipRow}>
                <Text style={styles.tipText}>+${(tip / 100).toFixed(2)} tip</Text>
                <MaterialIcons name="arrow-upward" size={11} color="#00E297" />
              </View>
            ) : (
              <Text style={styles.deliveryStatus}>Delivered ✓</Text>
            )}
          </View>
          <MaterialIcons name="chevron-right" size={18} color="rgba(255, 255, 255, 0.25)" />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  deliveryCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
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
    gap: 12,
    flex: 1,
  },
  deliveryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(179, 197, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryMeta: {
    flex: 1,
  },
  deliveryId: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  deliverySub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  deliveryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  deliveryAmount: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tipText: {
    color: GREEN,
    fontSize: 11.5,
    fontWeight: '700',
  },
  deliveryStatus: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11.5,
    fontWeight: '500',
  },
});
