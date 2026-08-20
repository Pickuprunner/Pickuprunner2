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
  TouchableWithoutFeedback,
  Linking,
} from 'react-native';
import {
  ShoppingBag,
  MapPin,
  Phone,
  User,
  Package,
  Mail,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Navigation,
  Truck,
  Zap,
} from '@blinkdotnew/mobile-ui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { blink } from '@/lib/blink';
import { blinkDbCreate } from '@/lib/blinkApi';
import { colors, gradients, borderRadius } from '@/constants/design';
import { APP_CONFIG, IS_STORE_BUILD, ORDER_SCOPE } from '@/lib/config';
import { calcDistanceMiles } from '@/lib/distance';
import { isValidEmail } from '@/lib/validation';
import CustomInput from '@/components/core/CustomInput';
import { useToast } from '@/components/core';

const SESSION_KEY = 'customer_session_id';
const DELIVERY_FEE = APP_CONFIG.DELIVERY_FEE_CENTS;
const MILEAGE_FREE_MILES = APP_CONFIG.FREE_MILES;
const MILEAGE_RATE_CENTS = APP_CONFIG.MILEAGE_RATE_CENTS;

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
  miles: '',
  deliveryType: 'door',
};

const TIP_OPTIONS = [
  { label: '$5', cents: 5_00 },
  { label: '$10', cents: 10_00 },
  { label: '$15', cents: 15_00 },
  { label: '$20', cents: 20_00 },
  { label: '$25', cents: 25_00 },
];

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function calcMileageCents(milesStr: string): number {
  const miles = parseFloat(milesStr);
  if (!isFinite(miles) || miles <= MILEAGE_FREE_MILES) return 0;
  return Math.round((miles - MILEAGE_FREE_MILES) * MILEAGE_RATE_CENTS);
}

// ─── Step 1: Pickup Details Form ────────────────────────────────────────────

interface StepOneProps {
  form: FormState;
  set: (key: keyof FormState) => (val: string) => void;
  onNext: () => void;
  error: string;
  setDeliveryType: (v: 'door' | 'meet') => void;
}

function StepOne({ form, set, onNext, error, setDeliveryType }: StepOneProps) {
  const mileageCents = calcMileageCents(form.miles);
  const miles = parseFloat(form.miles);
  const hasValidMiles = isFinite(miles) && miles > 0;

  const [calculating, setCalculating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-calculate distance when both addresses are filled
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const pickup = form.address?.trim();
    const delivery = form.deliveryAddress?.trim();
    if (!pickup || !delivery) return;

    timerRef.current = setTimeout(async () => {
      setCalculating(true);
      try {
        const calculatedMiles = await calcDistanceMiles(pickup, delivery);
        if (calculatedMiles !== null && calculatedMiles > 0) {
          set('miles')(String(calculatedMiles));
        }
      } catch {}
      setCalculating(false);
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form.address, form.deliveryAddress]);

  const nameStatus =
    form.name.length === 0 ? 'default' : form.name.trim().length >= 2 ? 'success' : 'default';

  const phoneStatus =
    form.phone.length === 0 ? 'default' : form.phone.trim().length >= 7 ? 'success' : 'default';

  const isEmailValid = isValidEmail(form.email);
  const emailStatus =
    form.email.length === 0 ? 'default' : isEmailValid ? 'success' : 'error';

  const isPickupLocked = APP_CONFIG.LOCK_PICKUP_ADDRESS && IS_STORE_BUILD;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={Keyboard.dismiss} style={styles.innerContent}>
          {/* Store Info Banner (For store-specific builds) */}
          {IS_STORE_BUILD && (
            <View style={styles.storeBanner}>
              <View style={styles.storeHeaderRow}>
                <View style={styles.storeIconContainer}>
                  <ShoppingBag size={22} color={colors.secondaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeTitle}>{APP_CONFIG.STORE_NAME}</Text>
                  <Text style={styles.storeSubtitle}>{APP_CONFIG.STORE_TYPE}</Text>
                </View>
              </View>
              <View style={styles.storeDetailRow}>
                <MapPin size={14} color={colors.outline} />
                <Text style={styles.storeDetailText}>{APP_CONFIG.STORE_ADDRESS}</Text>
              </View>
              {APP_CONFIG.STORE_PHONE ? (
                <View style={styles.storeDetailRow}>
                  <Phone size={14} color={colors.outline} />
                  <Text style={styles.storeDetailText}>{APP_CONFIG.STORE_PHONE}</Text>
                </View>
              ) : null}
              <View style={styles.storeDetailRow}>
                <Navigation size={14} color={colors.outline} />
                <Text style={styles.storeDetailText}>{APP_CONFIG.STORE_HOURS}</Text>
              </View>
            </View>
          )}

          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.headerIconWrapper}>
              <ShoppingBag size={24} color="#0F131C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                {IS_STORE_BUILD ? `Order from ${APP_CONFIG.STORE_NAME}` : 'Request a Pickup'}
              </Text>
              <Text style={styles.headerStepText}>Step 1 of 2 — Your details</Text>
              <Text style={styles.headerDescText}>
                Give us your phone number and delivery address
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '50%' }]} />
          </View>

          {/* Quick Fill Form */}
          <View style={styles.testDataRow}>
            <Pressable
              onPress={() => {
                set('name')('Jamie Test');
                set('phone')('(520) 555-1234');
                set('pickupNumber')('#1042');
                set('email')('test@example.com');
                set('address')('5765 S Camino del Sol, Green Valley, AZ 85622');
                set('deliveryAddress')('123 E Test Ave, Sahuarita, AZ 85629');
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }
              }}
              style={({ pressed }) => [styles.testDataBadge, pressed && { opacity: 0.75 }]}
            >
              <Zap size={13} color={colors.secondaryContainer} />
              <Text style={styles.testDataText}>Fill the form</Text>
            </Pressable>
          </View>

          {/* Input Fields */}
          <View style={styles.formFields}>
            {/* Delivery Preference Toggle */}
            <View style={styles.deliveryPrefSection}>
              <Text style={styles.fieldSectionLabel}>DELIVERY PREFERENCE</Text>
              <View style={styles.prefRow}>
                <Pressable
                  onPress={() => {
                    setDeliveryType('door');
                    if (Platform.OS !== 'web') {
                      Haptics.selectionAsync().catch(() => {});
                    }
                  }}
                  style={[
                    styles.prefCard,
                    form.deliveryType === 'door' && styles.prefCardActiveGreen,
                  ]}
                >
                  <View style={styles.prefTopRow}>
                    <Text style={styles.prefEmoji}>🚪</Text>
                    <Text
                      style={[
                        styles.prefTitle,
                        form.deliveryType === 'door' && { color: colors.tertiary },
                      ]}
                      numberOfLines={1}
                    >
                      Leave at Door
                    </Text>
                  </View>
                  <Text style={styles.prefDesc} numberOfLines={1}>
                    Photo on delivery
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setDeliveryType('meet');
                    if (Platform.OS !== 'web') {
                      Haptics.selectionAsync().catch(() => {});
                    }
                  }}
                  style={[
                    styles.prefCard,
                    form.deliveryType === 'meet' && styles.prefCardActiveBlue,
                  ]}
                >
                  <View style={styles.prefTopRow}>
                    <Text style={styles.prefEmoji}>🤝</Text>
                    <Text
                      style={[
                        styles.prefTitle,
                        form.deliveryType === 'meet' && { color: colors.primary },
                      ]}
                      numberOfLines={1}
                    >
                      Meet at Door
                    </Text>
                  </View>
                  <Text style={styles.prefDesc} numberOfLines={1}>
                    Meet at your door
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* YOUR NAME */}
            <CustomInput
              label="YOUR NAME"
              value={form.name}
              onChangeText={set('name')}
              placeholder="e.g. Alex Rivera"
              autoCapitalize="words"
              returnKeyType="next"
              leftIcon={<User size={18} color={colors.outline} />}
              status={nameStatus}
            />

            {/* PHONE NUMBER */}
            <CustomInput
              label="PHONE NUMBER"
              value={form.phone}
              onChangeText={set('phone')}
              placeholder="e.g. (555) 123-4567"
              keyboardType="phone-pad"
              autoCapitalize="none"
              returnKeyType="next"
              leftIcon={<Phone size={18} color={colors.outline} />}
              status={phoneStatus}
            />

            {/* PICKUP INFO */}
            <CustomInput
              label="PICKUP INFO"
              value={form.pickupNumber}
              onChangeText={set('pickupNumber')}
              placeholder="e.g. #1042 or 'Deli Counter'"
              autoCapitalize="none"
              returnKeyType="next"
              leftIcon={<Package size={18} color={colors.outline} />}
            />

            {/* EMAIL (optional) */}
            <CustomInput
              label="EMAIL (OPTIONAL)"
              value={form.email}
              onChangeText={set('email')}
              placeholder="For order updates"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              leftIcon={<Mail size={18} color={colors.outline} />}
              status={emailStatus}
            />

            {/* PICKUP ADDRESS */}
            <CustomInput
              label={isPickupLocked ? 'PICKUP ADDRESS (STORE)' : 'PICKUP ADDRESS'}
              value={form.address}
              onChangeText={isPickupLocked ? undefined : set('address')}
              editable={!isPickupLocked}
              placeholder="123 Main St, City, State"
              autoCapitalize="words"
              returnKeyType="next"
              leftIcon={<MapPin size={18} color={colors.outline} />}
              status={form.address.trim().length >= 5 ? 'success' : 'default'}
            />

            {/* DELIVERY ADDRESS */}
            <CustomInput
              label="DELIVERY ADDRESS"
              value={form.deliveryAddress}
              onChangeText={set('deliveryAddress')}
              placeholder="Where should we bring it?"
              autoCapitalize="words"
              returnKeyType="done"
              leftIcon={<Navigation size={18} color={colors.outline} />}
              status={form.deliveryAddress.trim().length >= 5 ? 'success' : 'default'}
            />

            {/* Auto-calculated Distance Card */}
            <View style={styles.distanceSection}>
              <Text style={styles.fieldSectionLabel}>ESTIMATED DISTANCE</Text>
              {calculating ? (
                <View style={styles.distanceBoxLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.distanceTextLoading}>Calculating route distance…</Text>
                </View>
              ) : hasValidMiles ? (
                <View style={styles.distanceBoxSuccess}>
                  <Navigation size={18} color={colors.tertiary} />
                  <Text style={styles.distanceValueText}>{miles.toFixed(1)} miles</Text>
                  <Text style={styles.distanceDot}>·</Text>
                  <Text
                    style={[
                      styles.distanceSurchargeText,
                      mileageCents > 0
                        ? { color: colors.secondaryContainer }
                        : { color: colors.tertiary },
                    ]}
                  >
                    {mileageCents > 0 ? `+${fmt(mileageCents)} mileage surcharge` : 'No surcharge'}
                  </Text>
                </View>
              ) : (
                <View style={styles.distanceBoxEmpty}>
                  <Navigation size={18} color={colors.outline} />
                  <Text style={styles.distanceTextEmpty}>
                    {form.address?.trim() && form.deliveryAddress?.trim()
                      ? 'Could not calculate distance — enter specific street address'
                      : 'Enter pickup and delivery addresses to calculate distance'}
                  </Text>
                </View>
              )}
              <Text style={styles.distanceFootnote}>
                $2.00/mile · distance calculated automatically
              </Text>
            </View>

            {/* Error Message */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Next CTA Button */}
            <Pressable
              onPress={onNext}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            >
              <Text style={styles.primaryBtnText}>Next: Review Order</Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Step 2: Payment Summary & Review ─────────────────────────────────────────

interface StepTwoProps {
  form: FormState;
  tipCents: number;
  setTipCents: (v: number) => void;
  mileageCents: number;
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
  deliveryType: 'door' | 'meet';
  showCustomTip: boolean;
  setShowCustomTip: (v: boolean) => void;
  customTipText: string;
  setCustomTipText: (v: string) => void;
}

function StepTwo({
  form,
  tipCents,
  setTipCents,
  mileageCents,
  onBack,
  onSubmit,
  loading,
  error,
  deliveryType,
  showCustomTip,
  setShowCustomTip,
  customTipText,
  setCustomTipText,
}: StepTwoProps) {
  const miles = parseFloat(form.miles);
  const totalCents = DELIVERY_FEE + mileageCents + tipCents;
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={Keyboard.dismiss} style={styles.innerContent}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={[styles.headerIconWrapper, { backgroundColor: colors.tertiary }]}>
            <CreditCard size={24} color="#0F131C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Review Order</Text>
            <Text style={styles.headerStepText}>Step 2 of 2 — Confirm pickup request</Text>
          </View>
        </View>

        {/* Progress Bar (100%) */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: '100%', backgroundColor: colors.tertiary },
            ]}
          />
        </View>

        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>ORDER DETAILS</Text>

          <View style={styles.summaryAddressBlock}>
            <View style={styles.summaryAddressItem}>
              <View style={styles.summaryDotGreen} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryAddressLabel}>PICKUP FROM</Text>
                <Text style={styles.summaryAddressValue}>{form.address}</Text>
                {form.pickupNumber ? (
                  <Text style={styles.summaryAddressNote}>Info: {form.pickupNumber}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.summaryAddressDivider} />

            <View style={styles.summaryAddressItem}>
              <View style={styles.summaryDotBlue} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryAddressLabel}>DELIVER TO</Text>
                <Text style={styles.summaryAddressValue}>{form.deliveryAddress}</Text>
                <Text style={styles.summaryAddressNote}>
                  {deliveryType === 'door' ? 'Leave at Door' : 'Meet at Door'}
                </Text>
              </View>
            </View>
          </View>

          {/* Pricing Breakdown */}
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Base Delivery Fee</Text>
              <Text style={styles.priceValue}>{fmt(DELIVERY_FEE)}</Text>
            </View>

            {mileageCents > 0 ? (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Mileage ({miles.toFixed(1)} mi)</Text>
                <Text style={styles.priceValue}>{fmt(mileageCents)}</Text>
              </View>
            ) : null}

            {/* Tip Selection */}
            <View style={styles.tipSection}>
              <Text style={styles.priceLabel}>Driver Tip</Text>
              <View style={styles.tipRow}>
                {TIP_OPTIONS.map((opt) => {
                  const isSelected = !showCustomTip && tipCents === opt.cents;
                  return (
                    <Pressable
                      key={opt.cents}
                      onPress={() => {
                        setShowCustomTip(false);
                        setCustomTipText('');
                        setTipCents(opt.cents);
                        if (Platform.OS !== 'web') {
                          Haptics.selectionAsync().catch(() => {});
                        }
                      }}
                      style={[styles.tipBtn, isSelected && styles.tipBtnActive]}
                    >
                      <Text style={[styles.tipBtnText, isSelected && styles.tipBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={() => {
                    setShowCustomTip(true);
                    if (Platform.OS !== 'web') {
                      Haptics.selectionAsync().catch(() => {});
                    }
                  }}
                  style={[styles.tipBtn, showCustomTip && styles.tipBtnActive]}
                >
                  <Text
                    style={[styles.tipBtnText, showCustomTip && styles.tipBtnTextActive]}
                  >
                    Custom
                  </Text>
                </Pressable>
              </View>

              {showCustomTip && (
                <View style={{ marginTop: 8 }}>
                  <CustomInput
                    placeholder="Enter tip amount ($)"
                    value={customTipText}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
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
                  {tipCents < 5_00 && tipCents > 0 && (
                    <Text style={styles.tipWarningText}>Minimum tip is $5.00</Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Estimated Total</Text>
              <Text style={styles.totalValue}>{fmt(totalCents)}</Text>
            </View>
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
          {APP_CONFIG.STORE_EMAIL ? (
            <Pressable
              onPress={() => Linking.openURL(`mailto:${APP_CONFIG.STORE_EMAIL}`)}
              style={styles.expectItem}
            >
              <Text style={styles.expectNumber}>?</Text>
              <Text style={[styles.expectText, { color: colors.primary }]}>
                Questions? Email {APP_CONFIG.STORE_EMAIL}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Payment Notice */}
        <View style={styles.paymentNotice}>
          <CreditCard size={18} color={colors.tertiary} />
          <Text style={styles.paymentNoticeText}>
            No payment required right now. You'll receive a secure Stripe link when a driver
            picks up your delivery.
          </Text>
        </View>

        {/* Terms Agreement */}
        <View
          style={[
            styles.termsCard,
            agreedToTerms && { borderColor: colors.tertiary },
          ]}
        >
          <Pressable
            onPress={() => setAgreedToTerms((v) => !v)}
            style={styles.termsPressable}
          >
            <View
              style={[
                styles.termsCheckbox,
                agreedToTerms && {
                  backgroundColor: colors.tertiary,
                  borderColor: colors.tertiary,
                },
              ]}
            >
              {agreedToTerms && (
                <Ionicons name="checkmark" size={18} color="#0F131C" />
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
              including delivery and payment policies.
            </Text>
          </Pressable>
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <Pressable
            onPress={agreedToTerms ? onSubmit : undefined}
            disabled={loading || !agreedToTerms}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && agreedToTerms && styles.primaryBtnPressed,
              (!agreedToTerms || loading) && styles.btnDisabled,
            ]}
          >
            {loading ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.primaryBtnText}>Placing order…</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <Truck size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>
                  Place Order — {fmt(totalCents)}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable onPress={onBack} style={styles.backBtnOutline}>
            <ChevronLeft size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.backBtnText}>Edit Details</Text>
          </Pressable>
        </View>
      </Pressable>
    </ScrollView>
  );
}

// ─── Success Screen ──────────────────────────────────────────────────────────

interface SuccessProps {
  orderId: string | null;
  totalCents: number;
  onReset: () => void;
}

function SuccessScreen({ orderId, totalCents, onReset }: SuccessProps) {
  const formattedOrderId = orderId ? `#${orderId.slice(-6).toUpperCase()}` : '#CONFIRMED';

  return (
    <View style={styles.successRoot}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        contentContainerStyle={styles.successScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successContent}>
          {/* Glowing Animated Icon Container */}
          <View style={styles.successIconHalo}>
            <View style={styles.successIconCircle}>
              <Truck size={42} color="#FFFFFF" />
            </View>
            <View style={styles.successBadgeCheck}>
              <Ionicons name="checkmark-sharp" size={14} color="#0F131C" />
            </View>
          </View>

          {/* Titles */}
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successSubtitle}>
            A driver will accept your order shortly. You'll receive a live tracking and payment link when your delivery is picked up.
          </Text>

          {/* Order ID Pill */}
          <View style={styles.orderIdBadge}>
            <View style={styles.greenLiveDot} />
            <Text style={styles.orderIdText}>Order {formattedOrderId}</Text>
          </View>

          {/* Order Status & Total Card */}
          <View style={styles.successCard}>
            {/* Status Step Row */}
            <View style={styles.statusPillRow}>
              <View style={styles.statusPill}>
                <Ionicons name="radio-button-on" size={12} color={colors.tertiary} />
                <Text style={styles.statusPillText}>Driver matching in progress</Text>
              </View>
            </View>

            {/* Total Amount */}
            <View style={styles.successAmountContainer}>
              <Text style={styles.successTotalLabel}>ESTIMATED TOTAL</Text>
              <Text style={styles.successTotalValue}>{fmt(totalCents)}</Text>
            </View>

            <View style={styles.successCardDivider} />

            {/* Payment Notice */}
            <View style={styles.successPaymentNotice}>
              <CreditCard size={16} color={colors.tertiary} />
              <Text style={styles.successPaymentNoticeText}>
                No payment needed now · Stripe link sent upon pickup
              </Text>
            </View>
          </View>

          {/* Action CTAs */}
          <View style={styles.successActionButtons}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                }
                router.push('/(customer)/my-orders');
              }}
              style={({ pressed }) => [
                styles.successPrimaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Ionicons name="receipt-outline" size={19} color="#FFFFFF" />
              <Text style={styles.successPrimaryBtnText}>View in My Orders</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync().catch(() => {});
                }
                onReset();
              }}
              style={({ pressed }) => [
                styles.successSecondaryBtn,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons name="add-circle-outline" size={19} color="#DFE2EF" />
              <Text style={styles.successSecondaryBtnText}>Request Another Pickup</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Root Screen ─────────────────────────────────────────────────────────────

const NAME_KEY = 'customer_display_name';

export default function RequestPickupScreen() {
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY).then((saved) => {
      if (saved) setForm((f) => ({ ...f, name: f.name || saved }));
    });
  }, []);

  const [tipCents, setTipCents] = useState(5_00);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [customTipText, setCustomTipText] = useState('');

  const set = (key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const goToStep2 = () => {
    setError('');
    const { name, phone, address, deliveryAddress } = form;
    if (!name.trim() || !phone.trim() || !address.trim() || !deliveryAddress.trim()) {
      const msg = 'Please fill in Name, Phone, Pickup Address, and Delivery Address.';
      setError(msg);
      showToast('Missing required fields', { type: 'warning', description: msg });
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const sessionId = await getOrCreateSessionId();
      const mileageCents = calcMileageCents(form.miles);
      const finalTipCents = tipCents < 5_00 ? 5_00 : tipCents;

      const orderData = {
        customerName: form.name.trim(),
        customerPhone: form.phone.trim(),
        customerEmail: form.email.trim(),
        pickupAddress: form.address.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        items: `${form.deliveryType === 'meet' ? '[MEET CUSTOMER] ' : '[LEAVE AT DOOR] '}${
          form.pickupNumber.trim() || 'N/A'
        }`,
        distanceMiles: parseFloat(form.miles) || 0,
        status: 'pending',
        customerSessionId: sessionId,
        tipAmount: finalTipCents,
        paymentStatus: 'unpaid',
        cityId: APP_CONFIG.CITY_ID,
        storeId: APP_CONFIG.STORE_ID,
        orderScope: ORDER_SCOPE,
      };

      let result: any = null;
      let lastErr: any = null;

      const snakeData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(orderData)) {
        const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
        snakeData[snakeKey] = value;
      }

      try {
        result = await blinkDbCreate('orders', snakeData);
      } catch (restErr: any) {
        lastErr = restErr;
      }

      if (!result) {
        try {
          result = (await blink.db.orders.create(orderData)) as any;
        } catch (sdkErr: any) {
          lastErr = sdkErr;
        }
      }

      if (!result && lastErr) {
        throw new Error(
          `Could not save order: ${
            lastErr?.message || 'Network error. Please check your connection and try again.'
          }`
        );
      }

      const orderId = result?.id || `ord-${Math.random().toString(36).slice(2, 8)}`;
      setLastOrderId(orderId);

      // Cache locally so it is immediately visible in My Orders
      try {
        const raw = await AsyncStorage.getItem('customer_local_orders');
        const list = raw ? JSON.parse(raw) : [];
        const savedOrder = {
          id: orderId,
          ...orderData,
          createdAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          'customer_local_orders',
          JSON.stringify([savedOrder, ...list.filter((o: any) => o.id !== orderId)])
        );
      } catch (storageErr) {
        console.warn('Failed to save to customer_local_orders', storageErr);
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      showToast('Order placed successfully!', {
        type: 'success',
        description: 'Searching for nearby drivers to fulfill your delivery.',
      });

      setSuccess(true);
    } catch (err: any) {
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
    setTipCents(5_00);
    setStep(1);
    setError('');
    setSuccess(false);
    setShowCustomTip(false);
    setCustomTipText('');
    setLastOrderId(null);
  };

  if (success) {
    return (
      <SuccessScreen
        orderId={lastOrderId}
        totalCents={DELIVERY_FEE + calcMileageCents(form.miles) + tipCents}
        onReset={handleReset}
      />
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {step === 1 ? (
          <StepOne
            form={form}
            set={set}
            onNext={goToStep2}
            error={error}
            setDeliveryType={(v) => setForm((f) => ({ ...f, deliveryType: v }))}
          />
        ) : (
          <StepTwo
            form={form}
            tipCents={tipCents}
            setTipCents={setTipCents}
            mileageCents={calcMileageCents(form.miles)}
            onBack={() => {
              setError('');
              setStep(1);
            }}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
            deliveryType={form.deliveryType}
            showCustomTip={showCustomTip}
            setShowCustomTip={setShowCustomTip}
            customTipText={customTipText}
            setCustomTipText={setCustomTipText}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 64 : 56,
    paddingBottom: 40,
  },
  innerContent: {
    flex: 1,
  },

  // Store Banner
  storeBanner: {
    backgroundColor: 'rgba(0, 102, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 102, 255, 0.3)',
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  storeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(244, 195, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#DFE2EF',
  },
  storeSubtitle: {
    fontSize: 13,
    color: '#8C90A1',
  },
  storeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeDetailText: {
    fontSize: 13,
    color: '#C2C6D8',
    flex: 1,
  },

  // Header Section
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  headerIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#DFE2EF',
    letterSpacing: -0.3,
  },
  headerStepText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  headerDescText: {
    fontSize: 12.5,
    color: '#8C90A1',
    marginTop: 2,
  },

  // Progress Bar
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 18,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.secondaryContainer,
  },

  // Test Data Badge
  testDataRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },
  testDataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.35)',
  },
  testDataText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondaryContainer,
  },

  // Form
  formFields: {
    gap: 16,
  },
  fieldSectionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 2,
  },

  // Distance Section
  distanceSection: {
    gap: 4,
    marginTop: 4,
  },
  distanceBoxLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 102, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 102, 255, 0.3)',
    paddingHorizontal: 16,
    height: 52,
    gap: 10,
  },
  distanceTextLoading: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  distanceBoxSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 226, 151, 0.35)',
    paddingHorizontal: 16,
    height: 52,
    gap: 8,
  },
  distanceValueText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  distanceDot: {
    fontSize: 14,
    color: '#8C90A1',
  },
  distanceSurchargeText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  distanceBoxEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 16,
    height: 52,
    gap: 10,
  },
  distanceTextEmpty: {
    fontSize: 13.5,
    color: '#6B7280',
    flex: 1,
  },
  distanceFootnote: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    marginTop: 2,
  },

  // Delivery Preferences
  deliveryPrefSection: {
    gap: 4,
    marginBottom: 4,
  },
  prefRow: {
    flexDirection: 'row',
    gap: 10,
  },
  prefCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#151821',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
    justifyContent: 'center',
  },
  prefCardActiveGreen: {
    borderColor: colors.tertiary,
    backgroundColor: 'rgba(0, 226, 151, 0.10)',
    shadowColor: colors.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  prefCardActiveBlue: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  prefTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prefEmoji: {
    fontSize: 16,
  },
  prefTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#DFE2EF',
    letterSpacing: -0.2,
  },
  prefDesc: {
    fontSize: 11,
    color: '#8C90A1',
    marginTop: 1,
  },

  // Buttons
  primaryBtn: {
    height: 54,
    borderRadius: borderRadius.full,
    backgroundColor: '#0066FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  backBtnOutline: {
    height: 48,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  backBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#C2C6D8',
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  errorText: {
    color: '#FF8B8B',
    fontSize: 13.5,
  },

  // Step 2 Summary Card
  summaryCard: {
    backgroundColor: '#151821',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    gap: 14,
    marginBottom: 16,
  },
  summaryCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 1.2,
  },
  summaryAddressBlock: {
    backgroundColor: '#12151E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  summaryAddressItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  summaryDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.tertiary,
    marginTop: 5,
  },
  summaryDotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  summaryAddressDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginLeft: 20,
  },
  summaryAddressLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 0.8,
  },
  summaryAddressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  summaryAddressNote: {
    fontSize: 12,
    color: '#8C90A1',
    marginTop: 2,
  },
  priceBreakdown: {
    gap: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#C2C6D8',
  },
  priceValue: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tipSection: {
    gap: 8,
    marginTop: 4,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#12151E',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tipBtnActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  tipBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DFE2EF',
  },
  tipBtnTextActive: {
    color: '#0F131C',
  },
  tipWarningText: {
    fontSize: 12,
    color: '#FF8B8B',
    marginTop: 4,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.secondaryContainer,
  },

  // What to Expect
  expectCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  expectTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 1.2,
  },
  expectItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  expectNumber: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primary,
    width: 16,
  },
  expectText: {
    fontSize: 13,
    color: '#C2C6D8',
    flex: 1,
    lineHeight: 18,
  },

  // Payment Notice
  paymentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 226, 151, 0.25)',
    padding: 14,
    marginBottom: 16,
  },
  paymentNoticeText: {
    fontSize: 12.5,
    color: colors.tertiary,
    flex: 1,
    lineHeight: 17,
    fontWeight: '500',
  },

  // Terms Agreement
  termsCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 16,
    marginBottom: 16,
  },
  termsPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  termsCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  termsText: {
    fontSize: 13,
    color: '#C2C6D8',
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: '700',
    color: colors.secondaryContainer,
    textDecorationLine: 'underline',
  },
  actionButtonsRow: {
    gap: 8,
  },

  // Success Screen
  successRoot: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  successScroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 102, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  successBadgeCheck: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.tertiary,
    borderWidth: 2.5,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#8C90A1',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  orderIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  greenLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.tertiary,
  },
  orderIdText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  successCard: {
    backgroundColor: '#151821',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    width: '100%',
    alignItems: 'center',
    gap: 14,
    marginVertical: 4,
  },
  statusPillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.25)',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.tertiary,
  },
  successAmountContainer: {
    alignItems: 'center',
    gap: 4,
  },
  successTotalLabel: {
    fontSize: 11.5,
    color: '#8C90A1',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  successTotalValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.secondaryContainer,
  },
  successCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  successPaymentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  successPaymentNoticeText: {
    fontSize: 12,
    color: '#C2C6D8',
    flex: 1,
    lineHeight: 16,
    textAlign: 'center',
  },
  successActionButtons: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  successPrimaryBtn: {
    height: 54,
    borderRadius: borderRadius.full,
    backgroundColor: '#0066FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  successPrimaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  successSecondaryBtn: {
    height: 50,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  successSecondaryBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#DFE2EF',
  },
});
