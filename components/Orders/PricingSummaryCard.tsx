import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CustomInput } from '@/components/core';
import { APP_CONFIG } from '@/lib/config';
import { colors, spacing, borderRadius, typography } from '@/constants/design';

const TIP_OPTIONS = [500, 1000, 1500, 2000, 2500];

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

interface PricingSummaryCardProps {
  miles: string;
  onMilesChange: (val: string) => void;
  mileageCents: number;
  tipCents: number;
  onTipChange: (val: number) => void;
  totalCents: number;
}

export function PricingSummaryCard({
  miles,
  onMilesChange,
  mileageCents,
  tipCents,
  onTipChange,
  totalCents,
}: PricingSummaryCardProps) {
  const handleTipSelect = (amount: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    onTipChange(amount);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>PRICING & DRIVER TIP</Text>

      <View style={styles.content}>
        <CustomInput
          label={`DISTANCE (MILES) · free up to ${APP_CONFIG.FREE_MILES} mi`}
          placeholder="e.g. 4.5"
          value={miles}
          onChangeText={onMilesChange}
          keyboardType="decimal-pad"
          leftIcon={<MaterialIcons name="navigation" size={18} color={colors.outline} />}
          rightIcon={
            mileageCents > 0 ? (
              <View style={styles.mileagePill}>
                <Text style={styles.mileageText}>+{fmt(mileageCents)}</Text>
              </View>
            ) : undefined
          }
        />

        <View style={styles.tipSection}>
          <View style={styles.tipHeaderRow}>
            <Text style={styles.sectionLabel}>DRIVER TIP</Text>
            <Text style={styles.tipCurrentAmount}>{fmt(tipCents)}</Text>
          </View>

          <View style={styles.tipPillsRow}>
            {TIP_OPTIONS.map((t) => {
              const active = tipCents === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => handleTipSelect(t)}
                  style={[styles.tipPill, active && styles.tipPillActive]}
                >
                  <Text style={[styles.tipPillText, active && styles.tipPillTextActive]}>
                    {fmt(t)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Due on Pickup</Text>
          <Text style={styles.totalAmount}>{fmt(totalCents)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelMd,
    color: colors.outline,
    marginBottom: spacing.md,
    marginLeft: 2,
  },
  content: {
    gap: spacing.md,
  },
  mileagePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryAlpha20,
  },
  mileageText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  tipSection: {
    gap: spacing.sm,
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  tipCurrentAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondaryContainer,
  },
  tipPillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.DEFAULT,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipPillActive: {
    backgroundColor: colors.accentAlpha15,
    borderColor: colors.secondaryContainer,
  },
  tipPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  tipPillTextActive: {
    color: colors.secondaryContainer,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryFixed,
  },
});
