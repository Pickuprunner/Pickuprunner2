import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { CustomInput } from '@/components/core';
import { APP_CONFIG } from '@/lib/config';
import { colors, spacing } from '@/constants/design';

const TIP_OPTIONS = [
  { label: '$5', cents: 500 },
  { label: '$10', cents: 1000 },
  { label: '$15', cents: 1500 },
  { label: '$20', cents: 2000 },
  { label: '$25', cents: 2500 },
];

const GOLD = '#FFE399';
const GREEN = '#00E297';
const BLUE = '#1E75FF';
const DELIVERY_FEE = APP_CONFIG.DELIVERY_FEE_CENTS;

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function cleanAddress(addr: string): string {
  if (!addr) return '';
  return addr
    .replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4},\s*/i, '')
    .replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}\s+/i, '')
    .replace(/^unnamed road,\s*/i, '')
    .trim();
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
  itemsDescription?: string;
  hasAlcohol?: boolean;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
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
  itemsDescription = '',
  hasAlcohol = false,
  customerName = '',
  customerPhone = '',
  customerEmail = '',
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

  const cleanPickup = cleanAddress(pickupAddress);
  const cleanDelivery = cleanAddress(deliveryAddress);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>PRICING & REVIEW</Text>

      <View style={styles.content}>
        {/* Structured Route Summary Card */}
        <View style={styles.summaryCard}>
          {/* 1. Delivery Preference Header */}
          <View style={styles.prefHeader}>
            <View style={styles.prefIconCircle}>
              <MaterialIcons
                name={deliveryType === 'door' ? 'door-front' : 'people'}
                size={16}
                color={deliveryType === 'door' ? GOLD : GREEN}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefLabel}>DELIVERY PREFERENCE</Text>
              <Text style={styles.prefValue}>
                {deliveryType === 'door' ? 'Leave at Door · Photo on delivery' : 'Meet at Door · Hand off directly'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          {/* 2. Locations: Pickup & Delivery */}
          {cleanPickup ? (
            <View style={styles.summaryRow}>
              <View style={styles.dotGreen} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>PICKUP FROM</Text>
                <Text style={styles.rowValue}>{cleanPickup}</Text>
              </View>
            </View>
          ) : null}

          {cleanPickup && cleanDelivery ? <View style={styles.summaryDivider} /> : null}

          {cleanDelivery ? (
            <View style={styles.summaryRow}>
              <View style={styles.dotBlue} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>DELIVER TO</Text>
                <Text style={styles.rowValue}>{cleanDelivery}</Text>
              </View>
            </View>
          ) : null}

          {/* 3. Order & Pickup Info */}
          {(pickupNumber || itemsDescription || hasAlcohol) ? (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <View style={styles.dotPurple} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>ORDER & PICKUP DETAILS</Text>
                  {pickupNumber ? (
                    <Text style={styles.rowValueHighlight}>
                      Order / Pickup #: <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>{pickupNumber}</Text>
                    </Text>
                  ) : null}
                  {itemsDescription ? (
                    <Text style={styles.rowSubValue} numberOfLines={2}>
                      Items: {itemsDescription}
                    </Text>
                  ) : null}
                  {hasAlcohol ? (
                    <View style={styles.alcoholBadge}>
                      <MaterialIcons name="no-drinks" size={13} color="#FF6B6B" />
                      <Text style={styles.alcoholText}>Includes Alcohol (21+ ID Required)</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </>
          ) : null}

          {/* 4. Customer Contact */}
          {(customerName || customerPhone) ? (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <View style={styles.dotGold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>CUSTOMER CONTACT</Text>
                  <Text style={styles.rowValue}>
                    {customerName}{customerPhone ? ` · ${customerPhone}` : ''}
                  </Text>
                  {customerEmail ? (
                    <Text style={styles.rowSubValue}>{customerEmail}</Text>
                  ) : null}
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* 5. Estimated Distance */}
        <View style={styles.distanceCard}>
          <View style={styles.distanceLeftCol}>
            <View style={styles.distanceIconCircle}>
              <MaterialIcons name="navigation" size={16} color={GOLD} />
            </View>
            <View>
              <Text style={styles.distanceCardLabel}>
                ESTIMATED DISTANCE {APP_CONFIG.FREE_MILES > 0 ? `· Free up to ${APP_CONFIG.FREE_MILES} mi` : ''}
              </Text>
              <Text style={styles.distanceCardValue}>
                {miles && parseFloat(miles) > 0 ? `${miles} miles` : 'Calculating distance…'}
              </Text>
            </View>
          </View>

          {mileageCents > 0 ? (
            <View style={styles.mileagePill}>
              <Text style={styles.mileageText}>+{fmt(mileageCents)}</Text>
            </View>
          ) : (
            <View style={styles.freeMileageBadge}>
              <Text style={styles.freeMileageText}>Included</Text>
            </View>
          )}
        </View>

        {/* 6. Driver Tip */}
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

        {/* 7. Price Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>PRICE BREAKDOWN</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base delivery fee</Text>
            <Text style={styles.breakdownValue}>{fmt(DELIVERY_FEE)}</Text>
          </View>

          {mileageCents > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Mileage surcharge ({miles} mi @ {fmt(APP_CONFIG.MILEAGE_RATE_CENTS)}/mi)
              </Text>
              <Text style={styles.breakdownValue}>{fmt(mileageCents)}</Text>
            </View>
          )}

          {tipCents > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Driver tip</Text>
              <Text style={[styles.breakdownValue, { color: GOLD }]}>{fmt(tipCents)}</Text>
            </View>
          )}

          <View style={styles.breakdownDivider} />

          <View style={styles.breakdownTotalRow}>
            <Text style={styles.breakdownTotalLabel}>TOTAL</Text>
            <Text style={styles.breakdownTotalValue}>{fmt(totalCents)}</Text>
          </View>
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
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && (
                <MaterialIcons name="check" size={14} color="#0D111A" />
              )}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text
                style={styles.termsLink}
                onPress={() => router.push('/terms')}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                style={styles.termsLink}
                onPress={() => router.push('/privacy-policy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  content: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#121622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  prefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 10,
    borderRadius: 12,
  },
  prefIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  prefValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
    marginTop: 5,
  },
  dotBlue: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BLUE,
    marginTop: 5,
  },
  dotPurple: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B57EDC',
    marginTop: 5,
  },
  dotGold: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
    marginTop: 5,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
    lineHeight: 18,
  },
  rowValueHighlight: {
    fontSize: 12.5,
    fontWeight: '600',
    color: GOLD,
    marginTop: 2,
  },
  rowSubValue: {
    fontSize: 12,
    color: '#8C90A1',
    marginTop: 2,
  },
  alcoholBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  alcoholText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  distanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  distanceLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  distanceIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  distanceCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  mileagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 195, 0, 0.15)',
  },
  mileageText: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  freeMileageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
  },
  freeMileageText: {
    fontSize: 11,
    fontWeight: '600',
    color: GREEN,
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
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipPillActive: {
    backgroundColor: 'rgba(244, 195, 0, 0.15)',
    borderColor: '#F4C300',
  },
  tipPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  tipPillTextActive: {
    color: '#F4C300',
    fontWeight: '700',
  },
  breakdownCard: {
    backgroundColor: '#121622',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#8C90A1',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  breakdownTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: GOLD,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  checkboxChecked: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#8C90A1',
    lineHeight: 16,
  },
  termsLink: {
    color: GOLD,
    fontWeight: '600',
  },
});
