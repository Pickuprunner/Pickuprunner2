import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CARD_BG = 'rgba(255, 255, 255, 0.04)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
const TEXT_MUTED = '#94A3B8';

export interface ProfileSectionProps {
  title: string;
  badgeNode?: React.ReactNode;
  children: React.ReactNode;
}

export function ProfileSection({ title, badgeNode, children }: ProfileSectionProps) {
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {badgeNode}
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function ItemDivider({ marginLeft = 66 }: { marginLeft?: number }) {
  return <View style={[styles.itemDivider, { marginLeft }]} />;
}

const styles = StyleSheet.create({
  sectionWrap: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: CARD_BG,
    borderColor: CARD_BORDER,
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  itemDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
