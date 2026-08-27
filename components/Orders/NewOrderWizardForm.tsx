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
import { isValidEmail } from '@/lib/validation';

import { CustomerDetailsCard } from './CustomerDetailsCard';
import { RouteItemsCard } from './RouteItemsCard';
import { PricingSummaryCard } from './PricingSummaryCard';

const ACTIVE_COLOR = '#FFE399';
const INACTIVE_COLOR = '#C2C6D8';
const DONE_COLOR = '#00E297';
const TAB_BG = '#0F131C';
const TAB_BORDER = 'rgba(255, 255, 255, 0.06)';

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

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

  deliveryType?: 'door' | 'meet';
  onDeliveryTypeChange?: (v: 'door' | 'meet') => void;
  pickupNumber?: string;
  onPickupNumberChange?: (v: string) => void;
  hasAlcohol?: boolean;
  onHasAlcoholChange?: (v: boolean) => void;

  calculating?: boolean;
  showCustomTip?: boolean;
  setShowCustomTip?: (v: boolean) => void;
  customTipText?: string;
  setCustomTipText?: (v: string) => void;

  agreedToTerms?: boolean;
  onAgreedToTermsChange?: (v: boolean) => void;

  currentStep?: number;
  onCurrentStepChange?: (step: number) => void;

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
  deliveryType = 'door',
  onDeliveryTypeChange,
  pickupNumber = '',
  onPickupNumberChange,
  hasAlcohol = false,
  onHasAlcoholChange,
  calculating = false,
  showCustomTip,
  setShowCustomTip,
  customTipText,
  setCustomTipText,
  agreedToTerms = false,
  onAgreedToTermsChange,
  currentStep: externalCurrentStep,
  onCurrentStepChange: externalOnCurrentStepChange,
  onSubmit,
  loading,
}: NewOrderWizardFormProps) {
  const [internalCurrentStep, setInternalCurrentStep] = useState(1);
  const currentStep = externalCurrentStep !== undefined ? externalCurrentStep : internalCurrentStep;
  const setCurrentStep = externalOnCurrentStepChange || setInternalCurrentStep;

  const { showToast } = useToast();

  const haptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!customerName.trim() || !customerPhone.trim()) {
        showToast('Missing Details', {
          description: 'Customer name and phone number are required',
          type: 'warning',
        });
        return;
      }
      if (customerEmail.trim() && !isValidEmail(customerEmail.trim())) {
        showToast('Invalid Email', {
          description: 'Please enter a valid email address',
          type: 'warning',
        });
        return;
      }
    } else if (currentStep === 2) {
      if (!pickupAddress.trim() || !deliveryAddress.trim() || !items.trim()) {
        showToast('Missing Route Info', {
          description: 'Pickup address, delivery address, and items are required',
          type: 'warning',
        });
        return;
      }
    }
    haptic();
    setCurrentStep(Math.min(currentStep + 1, 3));
  };

  const handleBack = () => {
    haptic();
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const isSubmitDisabled = loading || (onAgreedToTermsChange !== undefined && !agreedToTerms);

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
                } else if (step.id === currentStep + 1) {
                  handleNext();
                }
              }}
              style={[
                styles.tabItem,
                isActive && styles.tabItemActive,
              ]}
            >
              <View style={styles.iconWrapper}>
                <MaterialIcons name={iconName} size={20} color={iconColor} />
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
            pickupNumber={pickupNumber}
            onPickupNumberChange={onPickupNumberChange}
            deliveryType={deliveryType}
            onDeliveryTypeChange={onDeliveryTypeChange}
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
            hasAlcohol={hasAlcohol}
            onHasAlcoholChange={onHasAlcoholChange}
            miles={miles}
            mileageCents={mileageCents}
            calculating={calculating}
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
            pickupAddress={pickupAddress}
            deliveryAddress={deliveryAddress}
            pickupNumber={pickupNumber}
            deliveryType={deliveryType}
            showCustomTip={showCustomTip}
            setShowCustomTip={setShowCustomTip}
            customTipText={customTipText}
            setCustomTipText={setCustomTipText}
            agreedToTerms={agreedToTerms}
            onAgreedToTermsChange={onAgreedToTermsChange}
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
            onPress={isSubmitDisabled ? undefined : onSubmit}
            disabled={isSubmitDisabled}
            style={({ pressed }) => [
              styles.nextNavBtn,
              pressed && !isSubmitDisabled && styles.btnPressed,
              isSubmitDisabled && { opacity: 0.6 },
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
                  <Text style={styles.nextNavText}>
                    CREATE ORDER — {fmt(totalCents)}
                  </Text>
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
    fontSize: 11,
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
  stepContent: {},
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: spacing.xs,
  },
  backNavBtn: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backNavText: {
    color: '#DFE2EF',
    fontSize: 14,
    fontWeight: '600',
  },
  nextNavBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 102, 255, 0.35)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  nextNavGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  nextNavText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
