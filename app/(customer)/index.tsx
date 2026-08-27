import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  ActivityIndicator,
  View,
  Text,
  StatusBar,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import {
  MaterialIcons,
  Ionicons,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { blink } from '@/lib/blink';
import { ordersApi } from '@/apis/orders';
import { createCheckoutForOrder } from '@/apis/checkout';
import { useOrderStore } from '@/store/useOrderStore';
import { publishOrderChange } from '@/lib/realtime';
import { colors, spacing } from '@/constants/design';
import { APP_CONFIG, IS_STORE_BUILD, ORDER_SCOPE } from '@/lib/config';
import { calcDistanceMiles } from '@/lib/distance';
import { CustomHeader, useToast } from '@/components/core';
import { NewOrderWizardForm } from '@/components/Orders';

const SESSION_KEY = 'customer_session_id';
const NAME_KEY = 'customer_display_name';

const DELIVERY_FEE = APP_CONFIG.DELIVERY_FEE_CENTS;
const MILEAGE_FREE_MILES = APP_CONFIG.FREE_MILES;
const MILEAGE_RATE_CENTS = APP_CONFIG.MILEAGE_RATE_CENTS;

const GOLD_ACCENT = '#F5C400';
const GREEN = '#00E297';

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function calcMileageCents(milesStr: string): number {
  const miles = parseFloat(milesStr);
  if (!isFinite(miles) || miles <= MILEAGE_FREE_MILES) return 0;
  return Math.round((miles - MILEAGE_FREE_MILES) * MILEAGE_RATE_CENTS);
}

async function getOrCreateSessionId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const id = 'cust-' + Math.random().toString(36).slice(2, 10);
    await AsyncStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return 'cust-' + Math.random().toString(36).slice(2, 10);
  }
}

interface FormState {
  name: string;
  phone: string;
  email: string;
  pickupNumber: string;
  address: string;
  deliveryAddress: string;
  items: string;
  hasAlcohol: boolean;
  miles: string;
  deliveryType: 'door' | 'meet';
}

const INITIAL_ADDRESS = APP_CONFIG.LOCK_PICKUP_ADDRESS ? APP_CONFIG.STORE_ADDRESS : '';
const EMPTY_FORM: FormState = {
  name: '',
  phone: '',
  email: '',
  pickupNumber: '',
  address: INITIAL_ADDRESS,
  deliveryAddress: '',
  items: '',
  hasAlcohol: false,
  miles: '',
  deliveryType: 'door',
};

export default function CustomerNewOrderScreen() {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY).then((saved) => {
      if (saved) setForm((f) => ({ ...f, name: f.name || saved }));
    });
  }, []);

  const [tipCents, setTipCents] = useState(500);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [customTipText, setCustomTipText] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [calculating, setCalculating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const pickup = form.address?.trim();
    const delivery = form.deliveryAddress?.trim();

    if (!pickup || !delivery || pickup.length < 5 || delivery.length < 5) {
      return;
    }

    timerRef.current = setTimeout(async () => {
      setCalculating(true);
      try {
        const calculatedMiles = await calcDistanceMiles(pickup, delivery);
        if (calculatedMiles !== null && calculatedMiles > 0) {
          setForm((prev) => ({ ...prev, miles: String(calculatedMiles) }));
        }
      } catch { }
      setCalculating(false);
    }, 1200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form.address, form.deliveryAddress]);

  const set = (key: keyof FormState) => (val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const haptic = (type: 'light' | 'medium' | 'success' = 'light') => {
    if (Platform.OS !== 'web') {
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      } else if (type === 'medium') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
      }
    }
  };

  const fillTestData = () => {
    setForm({
      name: 'Jamie Test',
      phone: '(520) 555-1234',
      pickupNumber: '#1042',
      email: 'test@example.com',
      address: '5765 S Camino del Sol, Green Valley, AZ 85622',
      deliveryAddress: '123 E Test Ave, Sahuarita, AZ 85629',
      items: '2 bags of groceries & deli counter order',
      hasAlcohol: false,
      miles: '3.5',
      deliveryType: 'door',
    });
    setTipCents(500);
    haptic('medium');
    showToast('Customer test data filled', { type: 'info' });
  };

  const handleSubmitOrder = async () => {
    if (!agreedToTerms) {
      showToast('Terms Agreement Required', {
        description: 'Please agree to the Terms of Use to place your order.',
        type: 'warning',
      });
      return;
    }

    setLoading(true);

    try {
      const sessionId = await getOrCreateSessionId();
      const finalTipCents = tipCents < 500 ? 500 : tipCents;

      const orderItems = `${form.deliveryType === 'meet' ? '[MEET AT DOOR] ' : '[LEAVE AT DOOR] '}${
        form.hasAlcohol ? '[21+ ALCOHOL ID REQUIRED] ' : ''
      }${form.pickupNumber.trim() ? `Order: ${form.pickupNumber.trim()} · ` : ''}${form.items.trim()}`.trim();

      const fallbackOrderId = `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      let serverOrder: any = null;

      try {
        serverOrder = await ordersApi.create({
          customerName: form.name.trim(),
          customerPhone: form.phone.trim(),
          customerEmail: form.email.trim() || undefined,
          pickupAddress: form.address.trim(),
          deliveryAddress: form.deliveryAddress.trim(),
          pickupLat: 31.9505,
          pickupLng: -110.9747,
          items: orderItems || '[LEAVE AT DOOR] Standard delivery items',
          distanceMiles: parseFloat(form.miles) || 0,
          tipAmount: finalTipCents,
          customerSessionId: sessionId,
          cityId: APP_CONFIG.CITY_ID,
          storeId: APP_CONFIG.STORE_ID,
          orderScope: ORDER_SCOPE,
        });
      } catch (apiErr: any) {
        console.warn('[customer-new-order] ordersApi.create failed, fallback local:', apiErr);
      }

      const finalOrder = serverOrder || {
        id: fallbackOrderId,
        customerName: form.name.trim(),
        customerPhone: form.phone.trim(),
        customerEmail: form.email.trim(),
        pickupAddress: form.address.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        items: orderItems || '[LEAVE AT DOOR] Standard delivery items',
        distanceMiles: parseFloat(form.miles) || 0,
        status: 'pending' as const,
        customerSessionId: sessionId,
        tipAmount: finalTipCents,
        paymentStatus: 'unpaid',
        cityId: APP_CONFIG.CITY_ID,
        storeId: APP_CONFIG.STORE_ID,
        orderScope: ORDER_SCOPE,
        createdAt: new Date().toISOString(),
      };

      const orderId = finalOrder.id;
      setLastOrderId(orderId);

      useOrderStore.getState().upsertOrder(finalOrder);

      try {
        const raw = await AsyncStorage.getItem('customer_local_orders');
        const list = raw ? JSON.parse(raw) : [];
        await AsyncStorage.setItem('customer_local_orders', JSON.stringify([finalOrder, ...list.filter((o: any) => o.id !== orderId)]));
      } catch (storageErr) {
        console.warn('Failed to save to customer_local_orders', storageErr);
      }

      try {
        await blink.db.orders.create(finalOrder).catch(() => { });
      } catch { }

      publishOrderChange({
        orderId,
        type: 'created',
        customerName: form.name.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        items: orderItems,
      }).catch(() => { });

      if (form.name.trim()) {
        AsyncStorage.setItem(NAME_KEY, form.name.trim()).catch(() => { });
      }

      haptic('success');
      showToast('Order Placed Successfully!', {
        type: 'success',
        description: 'Searching for nearby drivers to fulfill your delivery.',
      });
      setSuccess(true);
    } catch (err: any) {
      console.error('[customer-new-order] Submit failed:', err);
      const errMsg = err?.message || 'Something went wrong. Please try again.';
      showToast('Order placement failed', {
        type: 'error',
        description: errMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setTipCents(500);
    setCurrentStep(1);
    setSuccess(false);
    setShowCustomTip(false);
    setCustomTipText('');
    setAgreedToTerms(false);
    setLastOrderId(null);
    setCheckoutUrl(null);
    setCheckoutSessionId(null);
    setCheckoutLoading(false);
  };

  const mileageCents = calcMileageCents(form.miles);
  const totalCents = DELIVERY_FEE + mileageCents + tipCents;

  if (success) {
    const formattedOrderId = lastOrderId ? `#${lastOrderId.slice(-6).toUpperCase()}` : '#CONFIRMED';

    return (
      <View style={styles.successRoot}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <ScrollView
          contentContainerStyle={styles.successScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successContent}>
            <View style={styles.successIconHalo}>
              <View style={styles.successIconCircle}>
                <MaterialIcons name="local-shipping" size={40} color={GREEN} />
              </View>
              <View style={styles.successBadgeCheck}>
                <Ionicons name="checkmark-sharp" size={14} color="#0F131C" />
              </View>
            </View>

            <Text style={styles.successTitle}>Order Placed!</Text>
            <Text style={styles.successSubtitle}>
              A driver will accept your request shortly. You can track your delivery live in My Orders.
            </Text>

            <LinearGradient
              colors={['rgba(244, 195, 0, 0.22)', 'rgba(255, 227, 153, 0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successOrderPill}
            >
              <View style={styles.successOrderPillDot} />
              <Text style={styles.successOrderPillText}>ORDER {formattedOrderId}</Text>
            </LinearGradient>

            <View style={styles.successCard}>
              <View style={styles.successAmountRow}>
                <Text style={styles.successTotalLabel}>ESTIMATED TOTAL</Text>
                <Text style={styles.successTotalValue}>{fmt(totalCents)}</Text>
              </View>

              <View style={styles.successCardDivider} />

              {checkoutLoading ? (
                <View style={styles.successPaymentNotice}>
                  <ActivityIndicator size="small" color={GREEN} />
                  <Text style={styles.successPaymentNoticeText}>
                    Generating Stripe Checkout session…
                  </Text>
                </View>
              ) : checkoutUrl ? (
                <View style={{ gap: 10 }}>
                  <View style={styles.successPaymentNotice}>
                    <MaterialIcons name="lock" size={16} color={GREEN} />
                    <Text style={styles.successPaymentNoticeText}>
                      Stripe Checkout session generated successfully
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      haptic('medium');
                      Linking.openURL(checkoutUrl).catch((err) => {
                        console.error('Failed to open checkout URL:', err);
                        showToast('Could not open payment link', { type: 'error' });
                      });
                    }}
                    style={({ pressed }) => [
                      {
                        backgroundColor: '#635BFF',
                        borderRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <MaterialIcons name="payment" size={20} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                      Pay Now via Stripe Checkout
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.successPaymentNotice}>
                  <MaterialIcons name="credit-card" size={16} color={GREEN} />
                  <Text style={styles.successPaymentNoticeText}>
                    No payment needed now · Pay securely via Stripe on pickup
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.successActionButtons}>
              <Pressable
                onPress={() => {
                  haptic('medium');
                  router.push('/(customer)/my-orders');
                }}
                style={({ pressed }) => [
                  styles.successPrimaryBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <LinearGradient
                  colors={['#1E75FF', colors.primaryContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.successPrimaryBtnGradient}
                >
                  <MaterialIcons name="receipt-long" size={19} color="#FFFFFF" />
                  <Text style={styles.successPrimaryBtnText}>View in My Orders</Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => {
                  haptic('light');
                  handleReset();
                }}
                style={({ pressed }) => [
                  styles.successSecondaryBtn,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <MaterialIcons name="add-circle-outline" size={19} color="#DFE2EF" />
                <Text style={styles.successSecondaryBtnText}>Request Another Pickup</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  const titleNode = (
    <View style={styles.headerTitleRow}>
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.headerLogo}
        contentFit="contain"
      />
      <Text style={styles.headerTitleText}>
        {IS_STORE_BUILD ? `Order from ${APP_CONFIG.STORE_NAME}` : 'Request Pickup'}
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <CustomHeader
        title={titleNode}
        subtitle="Schedule a grocery or package pickup"
        showAvatar={false}
        rightContent={
          <Pressable
            onPress={fillTestData}
            style={({ pressed }) => [styles.testBtn, pressed && styles.btnPressed]}
          >
            <MaterialIcons name="bolt" size={14} color={GOLD_ACCENT} />
            <Text style={styles.testBtnText}>Fill Form</Text>
          </Pressable>
        }
      />

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
            customerName={form.name}
            onCustomerNameChange={set('name')}
            customerPhone={form.phone}
            onCustomerPhoneChange={set('phone')}
            customerEmail={form.email}
            onCustomerEmailChange={set('email')}
            pickupAddress={form.address}
            onPickupAddressChange={set('address')}
            deliveryAddress={form.deliveryAddress}
            onDeliveryAddressChange={set('deliveryAddress')}
            items={form.items}
            onItemsChange={set('items')}
            hasAlcohol={form.hasAlcohol}
            onHasAlcoholChange={set('hasAlcohol')}
            miles={form.miles}
            onMilesChange={set('miles')}
            mileageCents={mileageCents}
            tipCents={tipCents}
            onTipChange={setTipCents}
            totalCents={totalCents}
            deliveryType={form.deliveryType}
            onDeliveryTypeChange={set('deliveryType')}
            pickupNumber={form.pickupNumber}
            onPickupNumberChange={set('pickupNumber')}
            calculating={calculating}
            showCustomTip={showCustomTip}
            setShowCustomTip={setShowCustomTip}
            customTipText={customTipText}
            setCustomTipText={setCustomTipText}
            agreedToTerms={agreedToTerms}
            onAgreedToTermsChange={setAgreedToTerms}
            onSubmit={handleSubmitOrder}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitleText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 196, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 0, 0.3)',
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: GOLD_ACCENT,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  successRoot: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  successScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  successContent: {
    alignItems: 'center',
  },
  successIconHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.25)',
    position: 'relative',
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0, 226, 151, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadgeCheck: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F131C',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  successOrderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.3)',
  },
  successOrderPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD_ACCENT,
  },
  successOrderPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFE399',
    letterSpacing: 0.8,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#141824',
    borderRadius: 18,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  successAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  successTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: GOLD_ACCENT,
  },
  successCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },
  successPaymentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successPaymentNoticeText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 16,
  },
  successActionButtons: {
    width: '100%',
    gap: 12,
  },
  successPrimaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1E75FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  successPrimaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  successPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingVertical: 14,
  },
  successSecondaryBtnText: {
    color: '#DFE2EF',
    fontSize: 15,
    fontWeight: '600',
  },
});

