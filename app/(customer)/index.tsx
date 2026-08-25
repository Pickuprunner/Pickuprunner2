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
  Keyboard,
  Linking,
  Animated,
  Switch,
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
import { isValidEmail } from '@/lib/validation';
import { CustomInput, CustomHeader, useToast } from '@/components/core';

const SESSION_KEY = 'customer_session_id';
const NAME_KEY = 'customer_display_name';

const DELIVERY_FEE = APP_CONFIG.DELIVERY_FEE_CENTS;
const MILEAGE_FREE_MILES = APP_CONFIG.FREE_MILES;
const MILEAGE_RATE_CENTS = APP_CONFIG.MILEAGE_RATE_CENTS;

const ACTIVE_COLOR = '#FFE399';
const INACTIVE_COLOR = '#C2C6D8';
const DONE_COLOR = '#00E297';
const TAB_BG = '#0F131C';
const TAB_BORDER = 'rgba(255, 255, 255, 0.06)';
const GOLD = '#FFE399';
const GOLD_ACCENT = '#F5C400';
const GREEN = '#00E297';

const TIP_OPTIONS = [
  { label: '$5', cents: 500 },
  { label: '$10', cents: 1000 },
  { label: '$15', cents: 1500 },
  { label: '$20', cents: 2000 },
  { label: '$25', cents: 2500 },
];

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

const WIZARD_STEPS = [
  { id: 1, label: 'Customer', icon: 'person-outline' as const, activeIcon: 'person' as const },
  { id: 2, label: 'Route & Items', icon: 'inventory-2' as const, activeIcon: 'inventory-2' as const },
  { id: 3, label: 'Pricing & Review', icon: 'receipt-long' as const, activeIcon: 'receipt-long' as const },
];

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
  const [error, setError] = useState('');
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

  const [toggleWidth, setToggleWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(form.deliveryType === 'meet' ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: form.deliveryType === 'meet' ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  }, [form.deliveryType]);

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

  const handleNext = () => {
    setError('');
    if (currentStep === 1) {
      if (!form.name.trim() || !form.phone.trim()) {
        const msg = 'Customer name and phone number are required.';
        setError(msg);
        showToast('Missing details', { type: 'warning', description: msg });
        return;
      }
      if (form.email.trim() && !isValidEmail(form.email.trim())) {
        const msg = 'Please enter a valid email address.';
        setError(msg);
        showToast('Invalid Email', { type: 'warning', description: msg });
        return;
      }
    } else if (currentStep === 2) {
      if (!form.address.trim() || !form.deliveryAddress.trim() || !form.items.trim()) {
        const msg = 'Pickup address, delivery address, and order items are required.';
        setError(msg);
        showToast('Missing route info', { type: 'warning', description: msg });
        return;
      }
    }
    haptic('light');
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setError('');
    haptic('light');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
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

    setError('');
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

      setCheckoutLoading(true);
      let checkoutRes: any = null;
      try {
        const computedMileage = calcMileageCents(form.miles);
        const grandTotalCents = DELIVERY_FEE + computedMileage + finalTipCents;

        checkoutRes = await createCheckoutForOrder(orderId, {
          amountCents: grandTotalCents,
          customerEmail: form.email.trim() || undefined,
          testMode: true,
        });

        if (checkoutRes?.url) {
          setCheckoutUrl(checkoutRes.url);
          setCheckoutSessionId(checkoutRes.sessionId || null);
          finalOrder.checkoutUrl = checkoutRes.url;
          finalOrder.checkoutSessionId = checkoutRes.sessionId;
        }
      } catch (checkoutErr) {
        console.warn('[customer-new-order] createCheckout failed:', checkoutErr);
      } finally {
        setCheckoutLoading(false);
      }

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
        description: checkoutRes?.url
          ? 'Checkout session created! You can pay now via Stripe.'
          : 'Searching for nearby drivers to fulfill your delivery.',
      });
      setSuccess(true);
    } catch (err: any) {
      console.error('[customer-new-order] Submit failed:', err);
      const errMsg = err?.message || 'Something went wrong. Please try again.';
      setError(errMsg);
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
    setError('');
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
  const milesNum = parseFloat(form.miles);
  const hasValidMiles = isFinite(milesNum) && milesNum > 0;
  const totalCents = DELIVERY_FEE + mileageCents + tipCents;

  const isPickupLocked = APP_CONFIG.LOCK_PICKUP_ADDRESS && IS_STORE_BUILD;

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
        >
          <Pressable onPress={Keyboard.dismiss} style={styles.innerContent}>
            <View style={styles.tabBar}>
              {WIZARD_STEPS.map((s) => {
                const isActive = currentStep === s.id;
                const isDone = currentStep > s.id;
                const iconColor = isActive ? ACTIVE_COLOR : isDone ? DONE_COLOR : INACTIVE_COLOR;
                const iconName = isActive ? s.activeIcon : s.icon;

                return (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      if (s.id < currentStep) {
                        haptic('light');
                        setCurrentStep(s.id);
                      } else if (s.id === currentStep + 1) {
                        handleNext();
                      }
                    }}
                    style={[styles.tabItem, isActive && styles.tabItemActive]}
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
                      {s.label}
                    </Text>

                    {isActive && <View style={styles.activeIndicator} />}
                  </Pressable>
                );
              })}
            </View>

            {currentStep === 1 && (
              <View style={styles.cardSection}>
                <Text style={styles.sectionTitle}>CUSTOMER DETAILS & PREFERENCE</Text>

                <View style={styles.fieldsGap}>
                  <View style={styles.prefContainer}>
                    <Text style={styles.inputSectionLabel}>DELIVERY PREFERENCE</Text>
                    <View
                      style={styles.prefToggleContainer}
                      onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width)}
                    >
                      {toggleWidth > 0 && (
                        <Animated.View
                          style={[
                            styles.slidingPill,
                            {
                              width: (toggleWidth - 12) / 2,
                              left: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [4, toggleWidth - 4 - (toggleWidth - 12) / 2],
                              }),
                              borderColor:
                                form.deliveryType === 'door'
                                    ? 'rgba(255, 227, 153, 0.5)'
                                  : 'rgba(0, 226, 151, 0.5)',
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={
                              form.deliveryType === 'door'
                                ? ['rgba(255, 227, 153, 0.18)', 'rgba(255, 227, 153, 0.04)']
                                : ['rgba(0, 226, 151, 0.20)', 'rgba(0, 226, 151, 0.04)']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.slidingGradient}
                          />
                        </Animated.View>
                      )}

                      <Pressable
                        onPress={() => {
                          set('deliveryType')('door');
                          haptic('light');
                        }}
                        style={styles.prefTab}
                      >
                        <MaterialIcons
                          name="door-front"
                          size={20}
                          color={form.deliveryType === 'door' ? GOLD : '#8C90A1'}
                        />
                        <View style={styles.prefTextCol}>
                          <Text
                            style={[
                              styles.prefTitle,
                              form.deliveryType === 'door' && styles.prefTitleActiveDoor,
                            ]}
                          >
                            Leave at Door
                          </Text>
                          <Text style={styles.prefDesc}>Photo on delivery</Text>
                        </View>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          set('deliveryType')('meet');
                          haptic('light');
                        }}
                        style={styles.prefTab}
                      >
                        <Ionicons
                          name="people-outline"
                          size={20}
                          color={form.deliveryType === 'meet' ? GREEN : '#8C90A1'}
                        />
                        <View style={styles.prefTextCol}>
                          <Text
                            style={[
                              styles.prefTitle,
                              form.deliveryType === 'meet' && styles.prefTitleActiveMeet,
                            ]}
                          >
                            Meet at Door
                          </Text>
                          <Text style={styles.prefDesc}>Hand off directly</Text>
                        </View>
                      </Pressable>
                    </View>
                  </View>

                  <CustomInput
                    label="NAME *"
                    value={form.name}
                    onChangeText={set('name')}
                    placeholder="e.g. Jamie Rivera"
                    autoCapitalize="words"
                    returnKeyType="next"
                    leftIcon={<MaterialIcons name="person-outline" size={18} color={colors.outline} />}
                    status={form.name.trim().length >= 2 ? 'success' : 'default'}
                  />

                  <CustomInput
                    label="PHONE *"
                    value={form.phone}
                    onChangeText={set('phone')}
                    placeholder="e.g. (520) 555-0101"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    returnKeyType="next"
                    leftIcon={<MaterialIcons name="phone" size={18} color={colors.outline} />}
                    status={form.phone.trim().length >= 7 ? 'success' : 'default'}
                  />

                  <CustomInput
                    label="PICKUP INFO / ORDER #"
                    value={form.pickupNumber}
                    onChangeText={set('pickupNumber')}
                    placeholder="e.g. #1042 or 'Deli Counter'"
                    autoCapitalize="none"
                    returnKeyType="next"
                    leftIcon={<MaterialIcons name="tag" size={18} color={colors.outline} />}
                  />

                  <CustomInput
                    label="EMAIL (OPTIONAL)"
                    value={form.email}
                    onChangeText={set('email')}
                    placeholder="For delivery notification email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    leftIcon={<MaterialIcons name="mail-outline" size={18} color={colors.outline} />}
                    status={form.email.length > 0 && isValidEmail(form.email) ? 'success' : 'default'}
                  />
                </View>
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.cardSection}>
                <Text style={styles.sectionTitle}>ROUTE & ITEMS</Text>

                <View style={styles.fieldsGap}>
                  {IS_STORE_BUILD && (
                    <View style={styles.storeBanner}>
                      <View style={styles.storeHeaderRow}>
                        <View style={styles.storeIconCircle}>
                          <MaterialIcons name="store" size={20} color={GOLD} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.storeTitle}>{APP_CONFIG.STORE_NAME}</Text>
                          <Text style={styles.storeSubtitle}>{APP_CONFIG.STORE_TYPE}</Text>
                        </View>
                      </View>
                      <View style={styles.storeDetailRow}>
                        <MaterialIcons name="place" size={14} color={colors.outline} />
                        <Text style={styles.storeDetailText}>{APP_CONFIG.STORE_ADDRESS}</Text>
                      </View>
                    </View>
                  )}

                  <CustomInput
                    label={isPickupLocked ? 'PICKUP ADDRESS (STORE DEFAULT)' : 'PICKUP ADDRESS'}
                    value={form.address}
                    onChangeText={isPickupLocked ? undefined : set('address')}
                    editable={!isPickupLocked}
                    placeholder="Where to pick up"
                    autoCapitalize="words"
                    returnKeyType="next"
                    leftIcon={<MaterialIcons name="place" size={18} color={colors.secondaryContainer} />}
                    rightIcon={
                      isPickupLocked ? (
                        <MaterialIcons name="lock-outline" size={16} color={colors.outline} />
                      ) : undefined
                    }
                    status={form.address.trim().length >= 5 ? 'success' : 'default'}
                  />

                  <CustomInput
                    label="DELIVERY ADDRESS *"
                    value={form.deliveryAddress}
                    onChangeText={set('deliveryAddress')}
                    placeholder="Where to drop off"
                    autoCapitalize="words"
                    returnKeyType="next"
                    leftIcon={<MaterialIcons name="navigation" size={18} color={colors.primaryContainer} />}
                    status={form.deliveryAddress.trim().length >= 5 ? 'success' : 'default'}
                  />

                  <CustomInput
                    label="ORDER ITEMS *"
                    value={form.items}
                    onChangeText={set('items')}
                    placeholder="e.g. 2 grocery bags, milk & bread, order #1042..."
                    multiline
                    numberOfLines={3}
                    autoCapitalize="sentences"
                    leftIcon={<MaterialIcons name="inventory-2" size={18} color={colors.outline} />}
                    status={form.items.trim().length >= 3 ? 'success' : 'default'}
                  />

                  <Pressable
                    onPress={() => {
                      haptic('light');
                      set('hasAlcohol')(!form.hasAlcohol);
                    }}
                    style={[
                      styles.alcoholCard,
                      form.hasAlcohol && styles.alcoholCardActive,
                    ]}
                  >
                    <View style={styles.alcoholIconCircle}>
                      <MaterialIcons
                        name="wine-bar"
                        size={20}
                        color={form.hasAlcohol ? GOLD : '#8C90A1'}
                      />
                    </View>
                    <View style={styles.alcoholTextCol}>
                      <Text style={styles.alcoholTitle}>Order includes alcohol</Text>
                      <Text style={styles.alcoholSubtitle}>Driver will require 21+ ID at delivery</Text>
                    </View>
                    <Switch
                      value={form.hasAlcohol}
                      onValueChange={(val) => {
                        haptic('light');
                        set('hasAlcohol')(val);
                      }}
                      trackColor={{
                        false: 'rgba(255, 255, 255, 0.12)',
                        true: 'rgba(255, 227, 153, 0.45)',
                      }}
                      thumbColor={form.hasAlcohol ? GOLD : '#FFFFFF'}
                    />
                  </Pressable>

                  <View style={styles.distanceSection}>
                    <Text style={styles.inputSectionLabel}>ROUTE DISTANCE</Text>
                    {calculating ? (
                      <View style={styles.distanceBox}>
                        <ActivityIndicator size="small" color={GOLD} />
                        <Text style={styles.distanceTextMuted}>Calculating route distance…</Text>
                      </View>
                    ) : hasValidMiles ? (
                      <View style={[styles.distanceBox, styles.distanceBoxSuccess]}>
                        <MaterialIcons name="navigation" size={18} color={GREEN} />
                        <Text style={styles.distanceValueText}>{milesNum.toFixed(1)} miles</Text>
                        <Text style={styles.distanceDot}>·</Text>
                        <Text
                          style={[
                            styles.distanceSurchargeText,
                            mileageCents > 0 ? { color: GOLD } : { color: GREEN },
                          ]}
                        >
                          {mileageCents > 0 ? `+${fmt(mileageCents)} mileage surcharge` : 'Free mileage'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.distanceBox}>
                        <MaterialIcons name="navigation" size={18} color={colors.outline} />
                        <Text style={styles.distanceTextMuted}>
                          {form.address?.trim() && form.deliveryAddress?.trim()
                            ? 'Enter full street address to calculate route distance'
                            : 'Enter pickup and delivery addresses to estimate distance'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.distanceFootnote}>
                      First {APP_CONFIG.FREE_MILES} miles free · $2.00/mile thereafter
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {currentStep === 3 && (
              <View style={styles.cardSection}>
                <Text style={styles.sectionTitle}>PRICING & REVIEW</Text>

                <View style={styles.fieldsGap}>
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryAddressItem}>
                      <View style={styles.summaryDotGreen} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryAddressLabel}>PICKUP FROM</Text>
                        <Text style={styles.summaryAddressValue}>{form.address}</Text>
                        {form.pickupNumber ? (
                          <Text style={styles.summaryAddressNote}>Order Info: {form.pickupNumber}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.summaryAddressDivider} />

                    <View style={styles.summaryAddressItem}>
                      <View style={styles.summaryDotBlue} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryAddressLabel}>DELIVER TO</Text>
                        <Text style={styles.summaryAddressValue}>{form.deliveryAddress}</Text>
                        <View style={styles.summaryDeliveryBadge}>
                          <MaterialIcons
                            name={form.deliveryType === 'door' ? 'door-front' : 'people'}
                            size={13}
                            color={form.deliveryType === 'door' ? GOLD : GREEN}
                          />
                          <Text style={styles.summaryDeliveryBadgeText}>
                            {form.deliveryType === 'door' ? 'Leave at Door' : 'Meet at Door'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <CustomInput
                    label={`DISTANCE (MILES) · free up to ${APP_CONFIG.FREE_MILES} mi`}
                    placeholder="e.g. 4.5"
                    value={form.miles}
                    onChangeText={set('miles')}
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
                      <Text style={styles.inputSectionLabel}>DRIVER TIP</Text>
                      <Text style={styles.tipCurrentAmount}>{fmt(tipCents)}</Text>
                    </View>

                    <View style={styles.tipPillsRow}>
                      {TIP_OPTIONS.map((opt) => {
                        const isSelected = !showCustomTip && tipCents === opt.cents;
                        return (
                          <Pressable
                            key={opt.cents}
                            onPress={() => {
                              setShowCustomTip(false);
                              setCustomTipText('');
                              setTipCents(opt.cents);
                              haptic('light');
                            }}
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
                          setShowCustomTip(true);
                          haptic('light');
                        }}
                        style={[styles.tipPill, showCustomTip && styles.tipPillActive]}
                      >
                        <Text style={[styles.tipPillText, showCustomTip && styles.tipPillTextActive]}>
                          Custom
                        </Text>
                      </Pressable>
                    </View>

                    {showCustomTip && (
                      <View style={{ marginTop: 8 }}>
                        <CustomInput
                          placeholder="Enter custom tip ($)"
                          value={customTipText}
                          keyboardType="decimal-pad"
                          onChangeText={(text) => {
                            const cleaned = text.replace(/[^0-9.]/g, '');
                            setCustomTipText(cleaned);
                            const dollars = parseFloat(cleaned);
                            if (isFinite(dollars) && dollars >= 0) {
                              setTipCents(Math.round(dollars * 100));
                            } else if (cleaned === '') {
                              setTipCents(0);
                            }
                          }}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.breakdownCard}>
                    <Text style={styles.breakdownTitle}>PRICE BREAKDOWN</Text>

                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Base delivery fee</Text>
                      <Text style={styles.breakdownValue}>{fmt(DELIVERY_FEE)}</Text>
                    </View>

                    {mileageCents > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>
                          Mileage surcharge ({milesNum.toFixed(1)} mi)
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

                  <View style={styles.paymentNoticeBox}>
                    <MaterialIcons name="credit-card" size={18} color={GREEN} />
                    <Text style={styles.paymentNoticeText}>
                      No payment required now. A secure Stripe link will be sent when your delivery is picked up.
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      haptic('light');
                      setAgreedToTerms((v) => !v);
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
                </View>
              </View>
            )}

            {!!error && (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.navRow}>
              {currentStep > 1 && (
                <Pressable
                  onPress={handleBack}
                  style={({ pressed }) => [styles.backNavBtn, pressed && styles.btnPressed]}
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
                  onPress={agreedToTerms ? handleSubmitOrder : undefined}
                  disabled={loading || !agreedToTerms}
                  style={({ pressed }) => [
                    styles.nextNavBtn,
                    pressed && agreedToTerms && styles.btnPressed,
                    (loading || !agreedToTerms) && { opacity: 0.6 },
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
                          PLACE ORDER — {fmt(totalCents)}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  innerContent: {
    gap: spacing.md,
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
  cardSection: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginLeft: 2,
  },
  fieldsGap: {
    gap: spacing.md,
  },
  prefContainer: {
    gap: 8,
  },
  inputSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  prefToggleContainer: {
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 4,
  },
  slidingPill: {
    position: 'absolute',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  slidingGradient: {
    flex: 1,
  },
  prefTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 2,
    height: '100%',
  },
  prefTextCol: {
    flexDirection: 'column',
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8C90A1',
  },
  prefTitleActiveDoor: {
    color: GOLD,
    fontWeight: '700',
  },
  prefTitleActiveMeet: {
    color: GREEN,
    fontWeight: '700',
  },
  prefDesc: {
    fontSize: 10,
    color: '#8C90A1',
  },
  storeBanner: {
    backgroundColor: '#141824',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  storeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  storeSubtitle: {
    fontSize: 12,
    color: '#8C90A1',
    marginTop: 1,
  },
  storeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeDetailText: {
    fontSize: 12.5,
    color: '#C2C6D8',
    flex: 1,
  },
  distanceSection: {
    gap: 6,
  },
  distanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  distanceBoxSuccess: {
    backgroundColor: 'rgba(0, 226, 151, 0.06)',
    borderColor: 'rgba(0, 226, 151, 0.3)',
  },
  distanceValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  distanceDot: {
    color: '#8C90A1',
    fontSize: 14,
  },
  distanceSurchargeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  distanceTextMuted: {
    fontSize: 12.5,
    color: '#8C90A1',
    flex: 1,
  },
  distanceFootnote: {
    fontSize: 11,
    color: '#8C90A1',
    marginLeft: 4,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: '#FF8B8B',
    fontSize: 13,
    flex: 1,
  },
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
  successRoot: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  successScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  successContent: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 16,
  },
  successIconHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 226, 151, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 226, 151, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadgeCheck: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
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
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13.5,
    color: '#8C90A1',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  successOrderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.4)',
  },
  successOrderPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
  },
  successOrderPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 0.5,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#121622',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
    marginTop: 8,
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
    color: GOLD,
  },
  successCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  successPaymentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  successPaymentNoticeText: {
    fontSize: 12,
    color: '#C2C6D8',
    flex: 1,
    lineHeight: 17,
  },
  successActionButtons: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  successPrimaryBtn: {
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
  },
  successPrimaryBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  successPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successSecondaryBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  successSecondaryBtnText: {
    color: '#DFE2EF',
    fontSize: 14.5,
    fontWeight: '600',
  },
  alcoholCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  alcoholCardActive: {
    backgroundColor: 'rgba(255, 227, 153, 0.08)',
    borderColor: 'rgba(255, 227, 153, 0.35)',
  },
  alcoholIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alcoholTextCol: {
    flex: 1,
  },
  alcoholTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DFE2EF',
  },
  alcoholSubtitle: {
    fontSize: 11,
    color: '#8C90A1',
    marginTop: 2,
  },
});
