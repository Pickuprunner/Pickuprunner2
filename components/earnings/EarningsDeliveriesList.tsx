import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Package } from '@blinkdotnew/mobile-ui';
import { EarningsDeliveryItem } from './EarningsDeliveryItem';

const CARD_BG = 'rgba(255, 255, 255, 0.04)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';

export interface EarningsDeliveriesListProps {
  orders: any[];
  calcOrderDriverCents: (order: any) => number;
  relativeDate: (iso: string) => string;
}

export function EarningsDeliveriesList({
  orders,
  calcOrderDriverCents,
  relativeDate,
}: EarningsDeliveriesListProps) {
  return (
    <View style={styles.recentSection}>
      <View style={styles.headerRow}>
        <Text style={styles.recentTitle}>Recent Deliveries</Text>
        {orders.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{orders.length} completed</Text>
          </View>
        )}
      </View>

      {orders.length > 0 ? (
        orders.slice(0, 10).map((order) => {
          const driverEarned = calcOrderDriverCents(order);
          const rawDate =
            order.deliveredAt ||
            order.delivered_at ||
            order.updatedAt ||
            order.updated_at ||
            order.createdAt ||
            '';
          const dateStr = relativeDate(rawDate);

          return (
            <EarningsDeliveryItem
              key={order.id}
              id={order.id}
              distanceMiles={order.distanceMiles}
              tipAmount={order.tipAmount}
              driverEarnedCents={driverEarned}
              dateStr={dateStr}
            />
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Package size={36} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyTitle}>No Deliveries Yet</Text>
          <Text style={styles.emptySubtitle}>
            Completed customer deliveries and tips will appear here automatically.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recentSection: {
    gap: 12,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  recentTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  countBadgeText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
