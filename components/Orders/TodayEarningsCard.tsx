import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { CustomCard } from '@/components/core';

export interface TodayStats {
  deliveries: number;
  miles: string;
  totalDisplay: string;
  tipsDisplay: string;
}

interface Props {
  stats: TodayStats;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TodayEarningsCard({ stats, containerStyle }: Props) {
  return (
    <CustomCard variant="glass" style={[styles.card, containerStyle]}>
      <Text style={styles.title}>Today's Earnings</Text>

      <Text style={styles.amount}>${stats.totalDisplay}</Text>

      <View style={styles.metricsRow}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>Deliveries</Text>
          <Text style={styles.metricValue}>{stats.deliveries}</Text>
        </View>

        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>Miles</Text>
          <Text style={styles.metricValue}>{stats.miles}</Text>
        </View>

        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>Tips</Text>
          <Text style={[styles.metricValue, styles.tipValue]}>
            +${stats.tipsDisplay}
          </Text>
        </View>
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    padding: 24,
    gap: 16,
  },
  title: {
    color: '#8C90A1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  amount: {
    color: '#FFE399',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    color: '#8C90A1',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValue: {
    color: '#DFE2EF',
    fontSize: 16,
    fontWeight: '700',
  },
  tipValue: {
    color: '#00E297',
  },
});
