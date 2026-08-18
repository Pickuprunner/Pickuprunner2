import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { YStack } from '@blinkdotnew/mobile-ui';
import type { DriverVerification } from '@/lib/verification';
import VerifCard from './VerifCard';

export default function AdminDocReviewPanel({ verifications }: { verifications: DriverVerification[] }) {
  const pending = verifications.filter((v) => v.status === 'pending');
  const rest = verifications.filter((v) => v.status !== 'pending');

  return (
    <YStack space="$2">
      {pending.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>NEEDS REVIEW ({pending.length})</Text>
        </View>
      )}
      {pending.map((v) => <VerifCard key={v.id} v={v} />)}
      {rest.length > 0 && (
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionHeaderText}>REVIEWED</Text>
        </View>
      )}
      {rest.map((v) => <VerifCard key={v.id} v={v} />)}
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
