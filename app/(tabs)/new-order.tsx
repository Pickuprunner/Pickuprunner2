import React, { useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ordersTable } from '@/lib/orders';
import { APP_CONFIG, ORDER_SCOPE } from '@/lib/config';
import { blinkDbCreate } from '@/lib/blinkApi';
import { useToast } from '@/components/core';
import {
  NewOrderHeader,
  NewOrderWizardForm,
} from '@/components/Orders';
import { colors,  spacing } from '@/constants/design';

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
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [pickupAddress, setPickupAddress] = useState(
    APP_CONFIG.LOCK_PICKUP_ADDRESS ? APP_CONFIG.STORE_ADDRESS : ''
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [items, setItems] = useState('');
  const [miles, setMiles] = useState('');
  const [tipCents, setTipCents] = useState(500);
  const [loading, setLoading] = useState(false);

  const mileageCents = calcMileageCents(miles);
  const totalCents = DELIVERY_FEE + mileageCents + tipCents;

  const handleCreateOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim() || !items.trim()) {
      showToast('Missing fields', {
        description: 'Name, phone, delivery address and items are required',
        type: 'error',
      });
      return;
    }
    if (tipCents < 500) {
      showToast('Tip required', { description: 'Minimum tip is $5.00', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim(),
        pickup_address: pickupAddress.trim(),
        delivery_address: deliveryAddress.trim(),
        items: items.trim(),
        status: 'pending',
        distance_miles: parseFloat(miles) || 0,
        tip_amount: tipCents,
        payment_status: 'unpaid',
        city_id: APP_CONFIG.CITY_ID,
        store_id: APP_CONFIG.STORE_ID,
        order_scope: ORDER_SCOPE,
      };

      const snakeData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(orderData)) {
        snakeData[key] = value;
      }
      try {
        await blinkDbCreate('orders', snakeData);
      } catch (restErr: any) {
        console.warn('[new-order] REST failed, trying SDK fallback:', restErr?.message);
        await ordersTable.create(orderData as any);
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      showToast('Order created', {
        description: `Order for ${customerName.trim()} added`,
        type: 'success',
      });
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setPickupAddress(APP_CONFIG.LOCK_PICKUP_ADDRESS ? APP_CONFIG.STORE_ADDRESS : '');
      setDeliveryAddress('');
      setItems('');
      setMiles('');
      setTipCents(500);
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
    setCustomerEmail('test@example.com');
    setPickupAddress('5765 S Camino del Sol, Green Valley, AZ 85622');
    setDeliveryAddress('123 E Test Ave, Sahuarita, AZ 85629');
    setItems('#1042 — grocery order');
    setMiles('3.5');
    setTipCents(1000);
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
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
            miles={miles}
            onMilesChange={setMiles}
            mileageCents={mileageCents}
            tipCents={tipCents}
            onTipChange={setTipCents}
            totalCents={totalCents}
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
    backgroundColor: colors.surfaceContainerLowest,
  },
  keyboardContainer: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
});
