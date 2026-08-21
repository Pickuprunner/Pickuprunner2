import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { CustomInput } from '@/components/core';
import { APP_CONFIG } from '@/lib/config';
import { colors, spacing, borderRadius, typography } from '@/constants/design';

const TIP_OPTIONS = [
  { label: '$5', cents: 500 },
  { label: '$10', cents: 1000 },
  { label: '$15', cents: 1500 },
  { label: '$20', cents: 2000 },
  { label: '$25', cents: 2500 },
];

const GOLD = '#FFE399';
const GREEN = '#00E297';
const DELIVERY_FEE = APP_CONFIG.DELIVERY_FEE_CENTS;

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
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupNumber?: string;
  deliveryType?: 'door' | 'meet';
  showCustomTip?: boolean;
  setShowCustomTip?: (val: boolean) => void;
  customTipText?: string;
  setCustomTipText?: (val: string) => void;
  agreedToTerms?: boolean;
  onAgreedToTermsChange?: (val: boolean) => void;
}

export function PricingSummaryCard({
  miles,
  onMilesChange,
  mileageCents,
  tipCents,
  onTipChange,
  totalCents,
  pickupAddress = '',
  deliveryAddress = '',
  pickupNumber = '',
  deliveryType = 'door',
  showCustomTip: externalShowCustomTip,
  setShowCustomTip: externalSetShowCustomTip,
  customTipText: externalCustomTipText,
  setCustomTipText: externalSetCustomTipText,
  agreedToTerms = false,
  onAgreedToTermsChange,
}: PricingSummaryCardProps) {
  const [internalShowCustomTip, setInternalShowCustomTip] = useState(false);
  const [internalCustomTipText, setInternalCustomTipText] = useState('');

  const isCustom = externalShowCustomTip !== undefined ? externalShowCustomTip : internalShowCustomTip;
  const setIsCustom = externalSetShowCustomTip || setInternalShowCustomTip;
  const customText = externalCustomTipText !== undefined ? externalCustomTipText : internalCustomTipText;
  const setCustomText = externalSetCustomTipText || setInternalCustomTipText;

  const milesNum = parseFloat(miles);

  const haptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handleTipSelect = (amount: number) => {
    haptic();
    setIsCustom(false);
    setCustomText('');
    onTipChange(amount);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>PRICING & REVIEW</Text>

      <View style={styles.content}>
        {/* Route Summary Card (if addresses provided) */}
        {(pickupAddress || deliveryAddress) && (
          <View style={styles.summaryCard}>
            {pickupAddress ? (
              <View style={styles.summaryAddressItem}>
                <View style={styles.summaryDotGreen} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryAddressLabel}>PICKUP FROM</Text>
                  <Text style={styles.summaryAddressValue}>{pickupAddress}</Text>
                  {pickupNumber ? (
                    <Text style={styles.summaryAddressNote}>Order Info: {pickupNumber}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {pickupAddress && deliveryAddress ? (
              <View style={styles.summaryAddressDivider} />
            ) : null}

            {deliveryAddress ? (
              <View style={styles.summaryAddressItem}>
                <View style={styles.summaryDotBlue} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryAddressLabel}>DELIVER TO</Text>
                  <Text style={styles.summaryAddressValue}>{deliveryAddress}</Text>
                  <View style={styles.summaryDeliveryBadge}>
                    <MaterialIcons
                      name={deliveryType === 'door' ? 'door-front' : 'people'}
                      size={13}
                      color={deliveryType === 'door' ? GOLD : GREEN}
                    />
                    <Text style={styles.summaryDeliveryBadgeText}>
                      {deliveryType === 'door' ? 'Leave at Door' : 'Meet at Door'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* Distance Input */}
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

        {/* Tip Selector */}
        <View style={styles.tipSection}>
          <View style={styles.tipHeaderRow}>
            <Text style={styles.sectionLabel}>DRIVER TIP</Text>
            <Text style={styles.tipCurrentAmount}>{fmt(tipCents)}</Text>
          </View>

          <View style={styles.tipPillsRow}>
            {TIP_OPTIONS.map((opt) => {
              const isSelected = !isCustom && tipCents === opt.cents;
              return (
                <Pressable
                  key={opt.cents}
                  onPress={() => handleTipSelect(opt.cents)}
                  style={[styles.tipPill, isSelected && styles.tipPillActive]}
                >
                  <Text style={[styles.tipPillText, isSelected && styles.tipPillTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => {
                setIsCustom(true);
                haptic();
              }}
              style={[styles.tipPill, isCustom && styles.tipPillActive]}
            >
              <Text style={[styles.tipPillText, isCustom && styles.tipPillTextActive]}>
                Custom
              </Text>
            </Pressable>
          </View>

          {isCustom && (
            <View style={{ marginTop: 8 }}>
              <CustomInput
                placeholder="Enter custom tip ($)"
                value={customText}
                keyboardType="decimal-pad"
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9.]/g, '');
                  setCustomText(cleaned);
                  const dollars = parseFloat(cleaned);
                  if (isFinite(dollars) && dollars >= 0) {
                    onTipChange(Math.round(dollars * 100));
                  } else if (cleaned === '') {
                    onTipChange(0);
                  }
                }}
              />
            </View>
          )}
        </View>

        {/* Price Breakdown Drawer */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>PRICE BREAKDOWN</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base delivery fee</Text>
            <Text style={styles.breakdownValue}>{fmt(DELIVERY_FEE)}</Text>
          </View>

          {mileageCents > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Mileage surcharge ({isFinite(milesNum) ? milesNum.toFixed(1) : '0'} mi)
              </Text>
              <Text style={[styles.breakdownValue, { color: GOLD }]}>
                {fmt(mileageCents)}
              </Text>
            </View>
          )}

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Driver tip</Text>
            <Text style={[styles.breakdownValue, { color: GREEN }]}>
              {fmt(tipCents)}
            </Text>
          </View>

          <View style={styles.breakdownDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalAmount}>{fmt(totalCents)}</Text>
          </View>
        </View>

        {/* What to Expect Card */}
        <View style={styles.expectCard}>
          <Text style={styles.expectTitle}>WHAT TO EXPECT</Text>
          <View style={styles.expectItem}>
            <Text style={styles.expectNumber}>1.</Text>
            <Text style={styles.expectText}>
              A driver accepts and picks up your order from the store.
            </Text>
          </View>
          <View style={styles.expectItem}>
            <Text style={styles.expectNumber}>2.</Text>
            <Text style={styles.expectText}>
              They deliver directly to your address — usually within the hour.
            </Text>
          </View>
          <View style={styles.expectItem}>
            <Text style={styles.expectNumber}>3.</Text>
            <Text style={styles.expectText}>
              You'll receive a secure Stripe payment link once picked up.
            </Text>
          </View>
        </View>

        {/* Payment Policy Notice */}
        <View style={styles.paymentNoticeBox}>
          <MaterialIcons name="credit-card" size={18} color={GREEN} />
          <Text style={styles.paymentNoticeText}>
            No payment required now. A secure Stripe link will be sent when your delivery is picked up.
          </Text>
        </View>

        {/* Terms Agreement Checkbox */}
        {onAgreedToTermsChange && (
          <Pressable
            onPress={() => {
              haptic();
              onAgreedToTermsChange(!agreedToTerms);
            }}
            style={styles.termsRow}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
              {agreedToTerms && (
                <Ionicons name="checkmark" size={14} color="#0F131C" />
              )}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text
                style={styles.termsLink}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push('/terms');
                }}
              >
                Terms of Use
              </Text>{' '}
              and delivery policies.
            </Text>
          </Pressable>
        )}
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
    letterSpacing: 1,
  },
  content: {
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: '#121622',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  summaryAddressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
    marginTop: 4,
  },
  summaryDotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryContainer,
    marginTop: 4,
  },
  summaryAddressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  summaryAddressValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  summaryAddressNote: {
    fontSize: 12,
    color: GOLD,
    marginTop: 2,
  },
  summaryAddressDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 2,
  },
  summaryDeliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  summaryDeliveryBadgeText: {
    fontSize: 12,
    color: '#C2C6D8',
    fontWeight: '500',
  },
  mileagePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(244, 195, 0, 0.15)',
  },
  mileageText: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
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
    color: GOLD,
  },
  tipPillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipPill: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipPillActive: {
    backgroundColor: 'rgba(255, 227, 153, 0.14)',
    borderColor: GOLD,
  },
  tipPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C2C6D8',
  },
  tipPillTextActive: {
    color: GOLD,
    fontWeight: '800',
  },
  breakdownCard: {
    backgroundColor: '#121622',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 1,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#C2C6D8',
  },
  breakdownValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: GOLD,
  },
  expectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  expectTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 1,
    marginBottom: 2,
  },
  expectItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  expectNumber: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  expectText: {
    fontSize: 12.5,
    color: '#C2C6D8',
    flex: 1,
    lineHeight: 18,
  },
  paymentNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.25)',
  },
  paymentNoticeText: {
    fontSize: 12,
    color: '#DFE2EF',
    flex: 1,
    lineHeight: 17,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  checkboxActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  termsText: {
    fontSize: 12.5,
    color: '#8C90A1',
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
