import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useToast } from '@/components/core';
import { colors, spacing, borderRadius, shadows } from '@/constants/design';

import { CustomerDetailsCard } from './CustomerDetailsCard';
import { RouteItemsCard } from './RouteItemsCard';
import { PricingSummaryCard } from './PricingSummaryCard';

const ACTIVE_COLOR = '#FFE399';
const INACTIVE_COLOR = '#C2C6D8';
const DONE_COLOR = '#00E297';
const TAB_BG = '#0F131C';
const TAB_BORDER = 'rgba(255, 255, 255, 0.06)';

interface NewOrderWizardFormProps {
  customerName: string;
  onCustomerNameChange: (v: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (v: string) => void;
  customerEmail: string;
  onCustomerEmailChange: (v: string) => void;

  pickupAddress: string;
  onPickupAddressChange: (v: string) => void;
  deliveryAddress: string;
  onDeliveryAddressChange: (v: string) => void;
  items: string;
  onItemsChange: (v: string) => void;

  miles: string;
  onMilesChange: (v: string) => void;
  mileageCents: number;
  tipCents: number;
  onTipChange: (v: number) => void;
  totalCents: number;

  onSubmit: () => void;
  loading: boolean;
}

const STEPS = [
  { id: 1, label: 'Customer', icon: 'person-outline' as const, activeIcon: 'person' as const },
  { id: 2, label: 'Route & Items', icon: 'inventory-2' as const, activeIcon: 'inventory-2' as const },
  { id: 3, label: 'Pricing & Review', icon: 'receipt-long' as const, activeIcon: 'receipt-long' as const },
];

export function NewOrderWizardForm({
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  customerEmail,
  onCustomerEmailChange,
  pickupAddress,
  onPickupAddressChange,
  deliveryAddress,
  onDeliveryAddressChange,
  items,
  onItemsChange,
  miles,
  onMilesChange,
  mileageCents,
  tipCents,
  onTipChange,
  totalCents,
  onSubmit,
  loading,
}: NewOrderWizardFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { showToast } = useToast();

  const haptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!customerName.trim() || !customerPhone.trim()) {
        showToast('Missing Info', {
          description: 'Customer name and phone number are required',
          type: 'error',
        });
        return;
      }
    } else if (currentStep === 2) {
      if (!deliveryAddress.trim() || !items.trim()) {
        showToast('Missing Info', {
          description: 'Delivery address and items description are required',
          type: 'error',
        });
        return;
      }
    }
    haptic();
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    haptic();
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;
          const iconColor = isActive ? ACTIVE_COLOR : isDone ? DONE_COLOR : INACTIVE_COLOR;
          const iconName = isActive ? step.activeIcon : step.icon;

          return (
            <Pressable
              key={step.id}
              onPress={() => {
                if (step.id < currentStep) {
                  haptic();
                  setCurrentStep(step.id);
                }
              }}
              style={[
                styles.tabItem,
                isActive && styles.tabItemActive,
              ]}
            >
              <View style={styles.iconWrapper}>
                <MaterialIcons name={iconName} size={22} color={iconColor} />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                  isDone && styles.tabLabelDone,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>

              {isActive && <View style={styles.activeIndicator} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.stepContent}>
        {currentStep === 1 && (
          <CustomerDetailsCard
            name={customerName}
            onNameChange={onCustomerNameChange}
            phone={customerPhone}
            onPhoneChange={onCustomerPhoneChange}
            email={customerEmail}
            onEmailChange={onCustomerEmailChange}
          />
        )}

        {currentStep === 2 && (
          <RouteItemsCard
            pickupAddress={pickupAddress}
            onPickupAddressChange={onPickupAddressChange}
            deliveryAddress={deliveryAddress}
            onDeliveryAddressChange={onDeliveryAddressChange}
            items={items}
            onItemsChange={onItemsChange}
          />
        )}

        {currentStep === 3 && (
          <PricingSummaryCard
            miles={miles}
            onMilesChange={onMilesChange}
            mileageCents={mileageCents}
            tipCents={tipCents}
            onTipChange={onTipChange}
            totalCents={totalCents}
          />
        )}
      </View>

      <View style={styles.navRow}>
        {currentStep > 1 && (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backNavBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <MaterialIcons name="arrow-back" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.backNavText}>Back</Text>
          </Pressable>
        )}

        {currentStep < 3 ? (
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.nextNavBtn,
              currentStep === 1 && { flex: 1 },
              pressed && styles.btnPressed,
            ]}
          >
            <LinearGradient
              colors={['#1E75FF', colors.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextNavGradient}
            >
              <Text style={styles.nextNavText}>
                {currentStep === 1 ? 'Next: Route & Items' : 'Next: Pricing & Review'}
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimaryContainer} />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            onPress={onSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.nextNavBtn,
              pressed && styles.btnPressed,
              loading && { opacity: 0.6 },
            ]}
          >
            <LinearGradient
              colors={['#1E75FF', colors.primaryContainer, '#004ECC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextNavGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={18} color={colors.onPrimaryContainer} />
                  <Text style={styles.nextNavText}>CREATE ORDER</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TAB_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TAB_BORDER,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: spacing.xs,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 14,
    position: 'relative',
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 227, 153, 0.06)',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: INACTIVE_COLOR,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '600',
  },
  tabLabelDone: {
    color: DONE_COLOR,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: ACTIVE_COLOR,
  },
  stepContent: {
    // Clean adaptive layout with no fixed artificial minHeight
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  backNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  backNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  nextNavBtn: {
    flex: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    shadowColor: shadows.cobaltGlow.shadowColor,
    shadowOffset: shadows.cobaltGlow.shadowOffset,
    shadowOpacity: shadows.cobaltGlow.shadowOpacity,
    shadowRadius: shadows.cobaltGlow.shadowRadius,
    elevation: 8,
  },
  nextNavGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  nextNavText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
    letterSpacing: 0.5,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
