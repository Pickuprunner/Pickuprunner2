import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { YStack } from '@blinkdotnew/mobile-ui';
import type { BackgroundCheck } from '@/lib/backgroundCheck';
import BGCard from './BGCard';

export default function AdminBGReviewPanel({ bgChecks }: { bgChecks: BackgroundCheck[] }) {
  const actionable = bgChecks.filter((c) => c.status === 'pending' || c.status === 'in_review');
  const rest = bgChecks.filter((c) => c.status !== 'pending' && c.status !== 'in_review');

  return (
    <YStack space="$2">
      {actionable.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>NEEDS REVIEW ({actionable.length})</Text>
        </View>
      )}
      {actionable.map((c) => <BGCard key={c.id} check={c} />)}
      {rest.length > 0 && (
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionHeaderText}>REVIEWED</Text>
        </View>
      )}
      {rest.map((c) => <BGCard key={c.id} check={c} />)}
    </YStack>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: 4,
    marginTop: 4,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.8,
  },
});
