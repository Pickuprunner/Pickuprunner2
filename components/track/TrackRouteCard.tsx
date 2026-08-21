import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/design';

export interface TrackRouteCardProps {
  pickupAddress: string;
  deliveryAddress: string;
  items?: string | null;
}

export function TrackRouteCard({ pickupAddress, deliveryAddress, items }: TrackRouteCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeaderLabel}>ROUTE & ITEM DETAILS</Text>

      {/* Pickup point */}
      <View style={styles.detailItem}>
        <View style={[styles.detailIconBox, { borderColor: colors.primaryAlpha40 }]}>
          <MaterialIcons name="storefront" size={14} color={colors.primary} />
        </View>
        <View style={styles.detailTextCol}>
          <Text style={[styles.detailLabel, { color: colors.primary }]}>PICK UP FROM</Text>
          <Text style={styles.detailValue}>{pickupAddress}</Text>
        </View>
      </View>

      <View style={styles.detailDivider} />

      {/* Dropoff point */}
      <View style={styles.detailItem}>
        <View style={[styles.detailIconBox, { borderColor: colors.greenAlpha40 }]}>
          <MaterialIcons name="location-on" size={14} color={colors.tertiary} />
        </View>
        <View style={styles.detailTextCol}>
          <Text style={[styles.detailLabel, { color: colors.tertiary }]}>DELIVER TO</Text>
          <Text style={styles.detailValue}>{deliveryAddress}</Text>
        </View>
      </View>

      {/* Items list if provided */}
      {!!items && (
        <>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <View style={[styles.detailIconBox, { borderColor: colors.accentAlpha40 }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.secondary} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={[styles.detailLabel, { color: colors.secondary }]}>ITEMS / PREFERENCES</Text>
              <Text style={styles.detailValue}>{items}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    backgroundColor: colors.glassLevel2Bg,
    padding: 20,
    gap: 14,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.outline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  detailTextCol: {
    flex: 1,
    gap: 3,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: 13.5,
    color: colors.onSurface,
    lineHeight: 19,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.glassLevel2Border,
  },
});
