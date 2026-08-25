import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useCreateOrder } from '@/lib/orders';
import { APP_CONFIG } from '@/lib/config';
import { calcDistanceMiles } from '@/lib/distance';
import { useToast } from '@/components/core';
import {
  NewOrderHeader,
  NewOrderWizardForm,
} from '@/components/Orders';
import { colors, spacing } from '@/constants/design';

const DELIVERY_FEE = APP_CONFIG.DELIVERY_FEE_CENTS;
const MILEAGE_RATE = APP_CONFIG.MILEAGE_RATE_CENTS;
const FREE_MILES = APP_CONFIG.FREE_MILES;

function calcMileageCents(milesStr: string): number {
  const miles = parseFloat(milesStr);
  if (!isFinite(miles) || miles <= FREE_MILES) return 0;
  return Math.round((miles - FREE_MILES) * MILEAGE_RATE);
}

export default function NewOrderScreen() {
  const { showToast } = useToast();
  const createOrder = useCreateOrder();

  const [currentStep, setCurrentStep] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [pickupNumber, setPickupNumber] = useState('');
  const [deliveryType, setDeliveryType] = useState<'door' | 'meet'>('door');

  const [pickupAddress, setPickupAddress] = useState(
    APP_CONFIG.LOCK_PICKUP_ADDRESS ? APP_CONFIG.STORE_ADDRESS : ''
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [items, setItems] = useState('');
  const [hasAlcohol, setHasAlcohol] = useState(false);
  const [miles, setMiles] = useState('');
  const [tipCents, setTipCents] = useState(500);
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [customTipText, setCustomTipText] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const shouldResetOnFocus = useRef(false);

  const resetForm = useCallback(() => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setPickupNumber('');
    setDeliveryType('door');
    setPickupAddress(APP_CONFIG.LOCK_PICKUP_ADDRESS ? APP_CONFIG.STORE_ADDRESS : '');
    setDeliveryAddress('');
    setItems('');
    setHasAlcohol(false);
    setMiles('');
    setTipCents(500);
    setShowCustomTip(false);
    setCustomTipText('');
    setAgreedToTerms(false);
    setCurrentStep(1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (shouldResetOnFocus.current) {
        resetForm();
        shouldResetOnFocus.current = false;
      }
    }, [resetForm])
  );

  const [calculating, setCalculating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const pickup = pickupAddress?.trim();
    const delivery = deliveryAddress?.trim();

    if (!pickup || !delivery || pickup.length < 5 || delivery.length < 5) {
      return;
    }

    timerRef.current = setTimeout(async () => {
      setCalculating(true);
      try {
        const calculatedMiles = await calcDistanceMiles(pickup, delivery);
        if (calculatedMiles !== null && calculatedMiles > 0) {
          setMiles(String(calculatedMiles));
        }
      } catch {}
      setCalculating(false);
    }, 1200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pickupAddress, deliveryAddress]);

  const mileageCents = calcMileageCents(miles);
  const totalCents = DELIVERY_FEE + mileageCents + tipCents;

  const handleCreateOrder = async () => {
    if (!agreedToTerms) {
      showToast('Terms Agreement Required', {
        description: 'Please agree to the Terms of Use to create an order.',
        type: 'warning',
      });
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim() || !items.trim()) {
      showToast('Missing fields', {
        description: 'Name, phone, delivery address and items are required',
        type: 'warning',
      });
      return;
    }
    if (tipCents < 500) {
      showToast('Tip required', { description: 'Minimum tip is $5.00', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const formattedItems = `${deliveryType === 'meet' ? '[MEET AT DOOR] ' : '[LEAVE AT DOOR] '}${
        hasAlcohol ? '[21+ ALCOHOL ID REQUIRED] ' : ''
      }${pickupNumber.trim() ? `Order: ${pickupNumber.trim()} · ` : ''}${items.trim()}`.trim();

      const created = await createOrder.mutateAsync({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        pickupAddress: pickupAddress.trim(),
        deliveryAddress: deliveryAddress.trim(),
        items: formattedItems || '[LEAVE AT DOOR] Standard delivery items',
        tipAmount: tipCents,
        distanceMiles: parseFloat(miles) || 0,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }

      showToast('Order created', {
        description: created?.checkoutUrl
          ? `Order for ${customerName.trim()} added with Stripe Checkout link`
          : `Order for ${customerName.trim()} added`,
        type: 'success',
      });

      shouldResetOnFocus.current = true;
      resetForm();
      router.push('/(tabs)');
    } catch (e: any) {
      console.error('[new-order] Create failed:', e?.message || e);
      showToast('Error', {
        description: e?.message || 'Failed to create order. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fillTestData = () => {
    setCustomerName('Jamie Test');
    setCustomerPhone('(520) 555-1234');
    setCustomerEmail('jamie.test@example.com');
    setPickupNumber('#4402');
    setPickupAddress(APP_CONFIG.LOCK_PICKUP_ADDRESS ? APP_CONFIG.STORE_ADDRESS : '101 Commerce Blvd, Tucson, AZ');
    setDeliveryAddress('5765 S Camino del Sol, Green Valley, AZ 85622');
    setItems('1 gallon milk, organic eggs, sourdough bread, chips');
    setMiles('12.5');
    setTipCents(750);
    setAgreedToTerms(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    showToast('Driver test data filled', { type: 'info' });
  };

  return (
    <View style={styles.root}>
      <NewOrderHeader onFillTest={fillTestData} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <NewOrderWizardForm
            currentStep={currentStep}
            onCurrentStepChange={setCurrentStep}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            customerPhone={customerPhone}
            onCustomerPhoneChange={setCustomerPhone}
            customerEmail={customerEmail}
            onCustomerEmailChange={setCustomerEmail}
            pickupAddress={pickupAddress}
            onPickupAddressChange={setPickupAddress}
            deliveryAddress={deliveryAddress}
            onDeliveryAddressChange={setDeliveryAddress}
            items={items}
            onItemsChange={setItems}
            hasAlcohol={hasAlcohol}
            onHasAlcoholChange={setHasAlcohol}
            miles={miles}
            onMilesChange={setMiles}
            mileageCents={mileageCents}
            tipCents={tipCents}
            onTipChange={setTipCents}
            totalCents={totalCents}
            deliveryType={deliveryType}
            onDeliveryTypeChange={setDeliveryType}
            pickupNumber={pickupNumber}
            onPickupNumberChange={setPickupNumber}
            calculating={calculating}
            showCustomTip={showCustomTip}
            setShowCustomTip={setShowCustomTip}
            customTipText={customTipText}
            setCustomTipText={setCustomTipText}
            agreedToTerms={agreedToTerms}
            onAgreedToTermsChange={setAgreedToTerms}
            onSubmit={handleCreateOrder}
            loading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  keyboardContainer: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: 110,
  },
});
