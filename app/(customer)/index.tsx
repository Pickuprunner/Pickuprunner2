import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  TextInput,
  Platform,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  ActivityIndicator,
  View,
} from 'react-native';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  ShoppingBag,
  MapPin,
  Phone,
  User,
  Package,
  Mail,
  CheckCircle,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Navigation,
  CheckSquare,
  Square,
  Truck,
} from '@blinkdotnew/mobile-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { blink } from '@/lib/blink';
import { blinkDbCreate } from '@/lib/blinkApi';
import { colors, spacing, borderRadius } from '@/constants/design';
import { APP_CONFIG, IS_STORE_BUILD, ORDER_SCOPE } from '@/lib/config';
import { Linking } from 'react-native';
import { calcDistanceMiles } from '@/lib/distance';

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

// Pre-fill pickup address from store config when LOCK_PICKUP_ADDRESS is true
const INITIAL_ADDRESS = APP_CONFIG.LOCK_PICKUP_ADDRESS ? APP_CONFIG.STORE_ADDRESS : '';
const EMPTY_FORM: FormState = { name: '', phone: '', email: '', pickupNumber: '', address: INITIAL_ADDRESS, deliveryAddress: '', miles: '', deliveryType: 'door' };

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
        const miles = await calcDistanceMiles(pickup, delivery);
        if (miles !== null && miles > 0) {
          set('miles')(String(miles));
        }
      } catch {}
      setCalculating(false);
    }, 1500); // 1.5s debounce after user stops typing
    
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [form.address, form.deliveryAddress]);

  const fields: {
    label: string;
    key: keyof FormState;
    placeholder: string;
    icon: React.ReactNode;
    multiline?: boolean;
    keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric' | 'decimal-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words';
  }[] = [
    { label: 'YOUR NAME', key: 'name', placeholder: 'e.g. Alex Rivera', icon: <User size={20} color="#6B7280" />, autoCapitalize: 'words' },
    { label: 'PHONE NUMBER', key: 'phone', placeholder: 'e.g. (555) 123-4567', icon: <Phone size={20} color="#6B7280" />, keyboardType: 'phone-pad', autoCapitalize: 'none' },
    { label: 'PICKUP INFO', key: 'pickupNumber', placeholder: 'e.g. #1042 or "Deli Counter"', icon: <Package size={20} color="#6B7280" />, autoCapitalize: 'none' },
    { label: 'EMAIL (optional)', key: 'email', placeholder: 'For order updates', icon: <Mail size={20} color="#6B7280" />, keyboardType: 'email-address', autoCapitalize: 'none' },
    { label: 'PICKUP ADDRESS', key: 'address', placeholder: '123 Main St, City, State', icon: <MapPin size={20} color="#6B7280" />, autoCapitalize: 'words' },
    { label: 'DELIVERY ADDRESS', key: 'deliveryAddress', placeholder: 'Where should we bring it?', icon: <Navigation size={20} color="#6B7280" />, autoCapitalize: 'words' },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Store info banner — shown on store-specific builds */}
        {IS_STORE_BUILD && (
          <YStack
            backgroundColor="rgba(0,102,255,0.1)"
            borderRadius={14}
            borderWidth={1.5}
            borderColor="rgba(0,102,255,0.3)"
            padding="$4"
            marginBottom="$4"
            space="$2"
          >
            <XStack alignItems="center" space="$3">
              <YStack
                width={44} height={44} borderRadius={22}
                backgroundColor="rgba(0,102,255,0.18)"
                alignItems="center" justifyContent="center"
                borderWidth={1} borderColor="rgba(0,102,255,0.4)"
              >
                <ShoppingBag size={24} color={APP_CONFIG.PRIMARY_COLOR} />
              </YStack>
              <YStack flex={1}>
                <SizableText size="$6" fontWeight="900" color="#111827">
                  {APP_CONFIG.STORE_NAME}
                </SizableText>
                <SizableText size="$3" color="#374151">{APP_CONFIG.STORE_TYPE}</SizableText>
              </YStack>
            </XStack>
            <XStack space="$2" alignItems="center" marginTop="$1">
              <MapPin size={15} color="#6B7280" />
              <SizableText size="$3" color="#374151" flex={1}>{APP_CONFIG.STORE_ADDRESS}</SizableText>
            </XStack>
            {APP_CONFIG.STORE_PHONE ? (
              <XStack space="$2" alignItems="center">
                <Phone size={15} color="#6B7280" />
                <SizableText size="$3" color="#374151">{APP_CONFIG.STORE_PHONE}</SizableText>
              </XStack>
            ) : null}
            <XStack space="$2" alignItems="center">
              <Navigation size={15} color="#6B7280" />
              <SizableText size="$3" color="#374151">{APP_CONFIG.STORE_HOURS}</SizableText>
            </XStack>
          </YStack>
        )}

        {/* Header */}
        <XStack alignItems="center" space="$3" marginBottom="$6">
          <YStack width={48} height={48} borderRadius={24} backgroundColor="#DBEAFE" alignItems="center" justifyContent="center">
            <ShoppingBag size={26} color="#2563EB" />
          </YStack>
          <YStack>
            <SizableText size="$7" fontWeight="800" color="#111827">
              {IS_STORE_BUILD ? `Order from ${APP_CONFIG.STORE_NAME}` : 'Request a Pickup'}
            </SizableText>
            <SizableText size="$3" color="#374151">Step 1 of 2 — Your details</SizableText>
            <SizableText size="$3" color="#6B7280" marginTop="$1">Give us your phone number and delivery address</SizableText>
          </YStack>
        </XStack>

        {/* Progress bar */}
        <XStack height={4} borderRadius={2} backgroundColor="#E5E7EB" marginBottom="$6">
          <YStack width="50%" height={4} borderRadius={2} backgroundColor="#2563EB" />
        </XStack>

        {/* Test data fill button */}
        <XStack justifyContent="flex-end" marginBottom="$2" marginTop={-8}>
          <Pressable
            onPress={() => {
              set('name')('Jamie Test');
              set('phone')('(520) 555-1234');
              set('pickupNumber')('#1042');
              set('email')('test@example.com');
              set('address')('5765 S Camino del Sol, Green Valley, AZ 85622');
              set('deliveryAddress')('123 E Test Ave, Sahuarita, AZ 85629');
            }}
            style={({ pressed }: { pressed: boolean }) => ({
              backgroundColor: pressed ? 'rgba(0,102,255,0.2)' : 'rgba(0,102,255,0.1)',
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: 'rgba(0,102,255,0.35)',
            })}
          >
            <SizableText size="$2" fontWeight="700" color="#2563EB">⚡ Fill test data</SizableText>
          </Pressable>
        </XStack>

        {/* Standard fields */}
        <YStack space="$4">
          {fields.map(({ label, key, placeholder, icon, multiline, keyboardType, autoCapitalize }) => {
            // Lock pickup address field for store builds
            const isLocked = key === 'address' && APP_CONFIG.LOCK_PICKUP_ADDRESS && IS_STORE_BUILD;
            return (
            <YStack key={key} space="$1">
              <XStack alignItems="center" space="$2">
                <SizableText size="$3" fontWeight="700" color="#374151">{label}</SizableText>
                {isLocked && (
                  <SizableText size="$2" fontWeight="700"
                    color={APP_CONFIG.PRIMARY_COLOR}
                    backgroundColor="rgba(0,102,255,0.12)"
                    paddingHorizontal={6} paddingVertical={2}
                    borderRadius={4}
                  >
                    STORE ADDRESS
                  </SizableText>
                )}
              </XStack>
              <XStack
                alignItems={multiline ? 'flex-start' : 'center'}
                backgroundColor={isLocked ? 'rgba(0,102,255,0.07)' : '#F9FAFB'}
                borderRadius={14}
                borderWidth={1}
                borderColor={isLocked ? 'rgba(0,102,255,0.3)' : '#E5E7EB'}
                paddingHorizontal="$4"
                paddingVertical={multiline ? '$3' : '$0'}
                space="$2"
              >
                <YStack marginTop={multiline ? 2 : 0}>{icon}</YStack>
                <TextInput
                  value={form[key]}
                  onChangeText={isLocked ? undefined : set(key)}
                  editable={!isLocked}
                  placeholder={placeholder}
                  placeholderTextColor="#9CA3AF"
                  multiline={multiline}
                  numberOfLines={multiline ? 3 : 1}
                  keyboardType={keyboardType ?? 'default'}
                  autoCapitalize={autoCapitalize ?? 'sentences'}
                  returnKeyType={multiline ? 'default' : 'next'}
                  style={[
                    styles.input,
                    multiline && styles.inputMultiline,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
                  ]}
                />
              </XStack>
            </YStack>
          );})}

          {/* Auto-calculated distance display */}
          <YStack space="$1">
            <SizableText size="$3" fontWeight="700" color="#374151">ESTIMATED DISTANCE</SizableText>
            {calculating ? (
              <XStack
                alignItems="center"
                backgroundColor="#F0F9FF"
                borderRadius={14}
                borderWidth={1}
                borderColor="#93C5FD"
                paddingHorizontal="$4"
                height={52}
                space="$2"
              >
                <ActivityIndicator size="small" color="#2563EB" />
                <SizableText size="$4" color="#2563EB">Calculating distance…</SizableText>
              </XStack>
            ) : hasValidMiles ? (
              <XStack
                alignItems="center"
                backgroundColor="#ECFDF5"
                borderRadius={14}
                borderWidth={1}
                borderColor="#86EFAC"
                paddingHorizontal="$4"
                height={52}
                space="$2"
              >
                <Navigation size={20} color="#16A34A" />
                <SizableText size="$5" fontWeight="800" color="#111827">{miles.toFixed(1)} miles</SizableText>
                <SizableText size="$4" color="#6B7280">·</SizableText>
                <SizableText size="$4" fontWeight="700" color={mileageCents > 0 ? '#D97706' : '#15803D'}>
                  {mileageCents > 0 ? `+${fmt(mileageCents)} surcharge` : 'No surcharge'}
                </SizableText>
              </XStack>
            ) : (
              <XStack
                alignItems="center"
                backgroundColor="#F9FAFB"
                borderRadius={14}
                borderWidth={1}
                borderColor="#E5E7EB"
                paddingHorizontal="$4"
                height={52}
                space="$2"
              >
                <Navigation size={20} color="#9CA3AF" />
                <SizableText size="$4" color="#9CA3AF">
                  {form.address?.trim() && form.deliveryAddress?.trim()
                    ? 'Could not calculate distance — enter addresses more specifically'
                    : 'Enter both addresses to calculate distance'}
                </SizableText>
              </XStack>
            )}
            <SizableText size="$3" color="#6B7280" paddingLeft="$1">
              $2.00/mile · distance calculated automatically
            </SizableText>
          </YStack>
        </YStack>

        {/* Delivery preference toggle */}
        <YStack marginBottom="$5" space="$2" marginTop="$5">
          <SizableText size="$3" fontWeight="700" color="#374151" letterSpacing={1}>DELIVERY PREFERENCE</SizableText>
          <XStack space="$3">
            <Pressable
              onPress={() => setDeliveryType('door')}
              style={({ pressed }: { pressed: boolean }) => ({
                flex: 1, borderRadius: 14, borderWidth: 2,
                borderColor: form.deliveryType === 'door' ? '#22c55e' : '#E5E7EB',
                backgroundColor: form.deliveryType === 'door' ? 'rgba(34,197,94,0.10)' : '#F9FAFB',
                padding: 14, alignItems: 'center', gap: 6,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <SizableText size="$6">🚪</SizableText>
              <SizableText size="$4" fontWeight="700" color={form.deliveryType === 'door' ? '#16A34A' : '#1F2937'}>Leave at Door</SizableText>
              <SizableText size="$2" color="#6B7280" textAlign="center">{'Driver takes a photo\nas proof of delivery'}</SizableText>
            </Pressable>
            <Pressable
              onPress={() => setDeliveryType('meet')}
              style={({ pressed }: { pressed: boolean }) => ({
                flex: 1, borderRadius: 14, borderWidth: 2,
                borderColor: form.deliveryType === 'meet' ? '#0066FF' : '#E5E7EB',
                backgroundColor: form.deliveryType === 'meet' ? 'rgba(0,102,255,0.08)' : '#F9FAFB',
                padding: 14, alignItems: 'center', gap: 6,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <SizableText size="$6">🤝</SizableText>
              <SizableText size="$4" fontWeight="700" color={form.deliveryType === 'meet' ? '#2563EB' : '#1F2937'}>Meet at Door</SizableText>
              <SizableText size="$2" color="#6B7280" textAlign="center">{"You'll meet the driver\nat your door"}</SizableText>
            </Pressable>
          </XStack>
        </YStack>

        {!!error && (
          <YStack backgroundColor="#FEE2E2" borderRadius={10} padding="$3" borderWidth={1} borderColor="#FCA5A5" marginTop="$3">
            <SizableText size="$4" color="#DC2626">{error}</SizableText>
          </YStack>
        )}

        <Pressable
          onPress={onNext}
          style={({ pressed }) => [styles.btn, { marginTop: spacing.lg }, pressed && styles.btnPressed]}
        >
          <XStack alignItems="center" space="$2">
            <SizableText size="$6" fontWeight="800" color="white">Next: Review Order</SizableText>
            <ChevronRight size={22} color="white" />
          </XStack>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Step 2: Payment Summary ─────────────────────────────────────────────────

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

function StepTwo({ form, tipCents, setTipCents, mileageCents, onBack, onSubmit, loading, error, deliveryType, showCustomTip, setShowCustomTip, customTipText, setCustomTipText }: StepTwoProps) {
  const miles = parseFloat(form.miles);
  const hasDistance = isFinite(miles) && miles > 0;
  const totalCents = DELIVERY_FEE + mileageCents + tipCents;
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <XStack alignItems="center" space="$3" marginBottom="$6">
        <YStack width={48} height={48} borderRadius={24} backgroundColor="#BBF7D0" alignItems="center" justifyContent="center">
          <CreditCard size={26} color="#16A34A" />
        </YStack>
        <YStack>
          <SizableText size="$7" fontWeight="800" color="#111827">Review Order</SizableText>
          <SizableText size="$3" color="#374151">Step 2 of 2 — Confirm your pickup request</SizableText>
        </YStack>
      </XStack>

      {/* Progress bar */}
      <XStack height={4} borderRadius={2} backgroundColor="#E5E7EB" marginBottom="$6">
        <YStack width="100%" height={4} borderRadius={2} backgroundColor="#16A34A" />
      </XStack>

      {/* Order summary card */}
      <YStack backgroundColor="#F9FAFB" borderRadius={16} borderWidth={1} borderColor="#E5E7EB" padding="$4" space="$3" marginBottom="$5">
        <SizableText size="$4" fontWeight="700" color="#374151">ORDER SUMMARY</SizableText>
        <YStack space="$2">
          <XStack justifyContent="space-between">
            <SizableText size="$4" color="#1F2937">Customer</SizableText>
            <SizableText size="$4" color="#111827" fontWeight="600">{form.name}</SizableText>
          </XStack>
          <XStack justifyContent="space-between">
            <SizableText size="$4" color="#1F2937">Phone</SizableText>
            <SizableText size="$4" color="#111827" fontWeight="600">{form.phone}</SizableText>
          </XStack>
          <XStack justifyContent="space-between" alignItems="flex-start">
            <SizableText size="$4" color="#1F2937">Pickup at</SizableText>
            <SizableText size="$4" color="#111827" fontWeight="600" textAlign="right" flex={1} marginLeft="$4">{form.address}</SizableText>
          </XStack>
          <XStack justifyContent="space-between" alignItems="flex-start">
            <SizableText size="$4" color="#1F2937">Pickup Info</SizableText>
            <SizableText size="$4" color="#111827" fontWeight="600" textAlign="right" flex={1} marginLeft="$4">{form.pickupNumber || '—'}</SizableText>
          </XStack>
          {hasDistance && (
            <XStack justifyContent="space-between">
              <SizableText size="$4" color="#1F2937">Distance</SizableText>
              <SizableText size="$4" color="#111827" fontWeight="600">{miles.toFixed(1)} mi</SizableText>
            </XStack>
          )}
          <XStack justifyContent="space-between" alignItems="flex-start">
            <SizableText size="$4" color="#1F2937">Deliver to</SizableText>
            <SizableText size="$4" color="#111827" fontWeight="600" textAlign="right" flex={1} marginLeft="$4">
              {form.deliveryAddress || '—'}
            </SizableText>
          </XStack>
          <XStack justifyContent="space-between" alignItems="center">
            <SizableText size="$4" color="#1F2937">Delivery</SizableText>
            <XStack space="$1" alignItems="center">
              <SizableText size="$4">{deliveryType === 'meet' ? '🤝' : '🚪'}</SizableText>
              <SizableText size="$4" color="#111827" fontWeight="600">{deliveryType === 'meet' ? 'Meet at Door' : 'Leave at Door'}</SizableText>
            </XStack>
          </XStack>
        </YStack>
      </YStack>

      {/* Pricing */}
      <YStack backgroundColor="#F9FAFB" borderRadius={16} borderWidth={1} borderColor="#E5E7EB" padding="$4" space="$4" marginBottom="$5">
        <SizableText size="$4" fontWeight="700" color="#374151">PRICING</SizableText>

        {/* Delivery fee */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <SizableText size="$5" color="#111827" fontWeight="600">Delivery Fee</SizableText>
            <SizableText size="$3" color="#6B7280">Base pickup & drop-off</SizableText>
          </YStack>
          <SizableText size="$6" fontWeight="800" color="#111827">{fmt(DELIVERY_FEE)}</SizableText>
        </XStack>

        {/* Mileage surcharge — only show if applicable */}
        {mileageCents > 0 && (
          <>
            <YStack height={1} backgroundColor="#E5E7EB" />
            <XStack justifyContent="space-between" alignItems="center">
              <YStack>
                <SizableText size="$5" color="#111827" fontWeight="600">Mileage Surcharge</SizableText>
                <SizableText size="$3" color="#6B7280">
                  {(miles - MILEAGE_FREE_MILES).toFixed(1)} mi × $2.00/mi
                </SizableText>
              </YStack>
              <SizableText size="$6" fontWeight="800" color="#D97706">{fmt(mileageCents)}</SizableText>
            </XStack>
          </>
        )}

        {/* Divider */}
        <YStack height={1} backgroundColor="#E5E7EB" />

        {/* Tip for driver */}
        <YStack space="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <SizableText size="$5" color="#111827" fontWeight="600">Tip for Driver</SizableText>
              <SizableText size="$3" color="#6B7280">Starting at $5 · no limit · 100% to driver</SizableText>
            </YStack>
            <SizableText size="$6" fontWeight="800" color="#16A34A">{fmt(tipCents)}</SizableText>
          </XStack>

          {/* Tip selector */}
          <XStack flexWrap="wrap" gap="$2">
            {TIP_OPTIONS.map((opt) => {
              const active = tipCents === opt.cents;
              return (
                <Pressable
                  key={opt.cents}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                    setTipCents(opt.cents);
                  }}
                  style={({ pressed }) => [
                    styles.tipBtn,
                    active && styles.tipBtnActive,
                    pressed && styles.tipBtnPressed,
                  ]}
                >
                  <SizableText size="$4" fontWeight="700" color={active ? 'white' : '#1F2937'}>
                    {opt.label}
                  </SizableText>
                </Pressable>
              );
            })}

            {/* Custom tip button — opens input to enter a custom amount */}
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                setShowCustomTip(true);
              }}
              style={({ pressed }) => [
                styles.tipBtn,
                showCustomTip && styles.tipBtnActive,
                pressed && styles.tipBtnPressed,
              ]}
            >
              <SizableText
                size="$4"
                fontWeight="700"
                color={showCustomTip ? 'white' : '#1F2937'}
              >
                Custom
              </SizableText>
            </Pressable>
          </XStack>

          {/* Custom tip input — shown when "Custom" is tapped */}
          {showCustomTip && (
            <XStack
              alignItems="center"
              space="$2"
              marginTop="$2"
              backgroundColor="#F3F4F6"
              borderRadius={10}
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderWidth={1}
              borderColor="#D1D5DB"
            >
              <SizableText size="$4" fontWeight="600" color="#374151">$</SizableText>
              <TextInput
                style={styles.customTipInput as any}
                value={customTipText}
                onChangeText={(t) => {
                  // Allow only digits and one decimal
                  const cleaned = t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  setCustomTipText(cleaned);
                  const dollars = parseFloat(cleaned);
                  if (isFinite(dollars) && dollars >= 0) {
                    setTipCents(Math.round(dollars * 100));
                  } else if (cleaned === '') {
                    setTipCents(0);
                  }
                }}
                placeholder="Enter amount"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                returnKeyType="done"
                autoFocus
              />
              {customTipText.length > 0 && (
                <Pressable
                  onPress={() => {
                    setCustomTipText('');
                    setTipCents(5_00);
                    setShowCustomTip(false);
                    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                  }}
                  hitSlop={10}
                >
                  <SizableText size="$4" color="#6B7280" fontWeight="600">✕</SizableText>
                </Pressable>
              )}
            </XStack>
          )}

          {showCustomTip && tipCents < 5_00 && tipCents > 0 && (
            <SizableText size="$3" color="#DC2626" fontWeight="600">
              Minimum tip is $5.00
            </SizableText>
          )}
        </YStack>

        {/* Divider */}
        <YStack height={1} backgroundColor="#E5E7EB" />

        {/* Total */}
        <XStack justifyContent="space-between" alignItems="center">
          <SizableText size="$6" fontWeight="800" color="#111827">Total</SizableText>
          <SizableText size="$7" fontWeight="800" color="#16A34A">{fmt(totalCents)}</SizableText>
        </XStack>
      </YStack>

      {/* What to expect */}
      <YStack
        backgroundColor="#F9FAFB"
        borderRadius={14}
        borderWidth={1}
        borderColor="#E5E7EB"
        padding="$4"
        space="$2"
        marginBottom="$4"
      >
        <SizableText size="$4" fontWeight="700" color="#374151">WHAT TO EXPECT</SizableText>
        <XStack space="$2" alignItems="flex-start">
          <SizableText size="$4" color="#6B7280">1.</SizableText>
          <SizableText size="$4" color="#1F2937" flex={1}>A driver picks up your order from the store</SizableText>
        </XStack>
        <XStack space="$2" alignItems="flex-start">
          <SizableText size="$4" color="#6B7280">2.</SizableText>
          <SizableText size="$4" color="#1F2937" flex={1}>They deliver to your address — usually within the hour</SizableText>
        </XStack>
        <XStack space="$2" alignItems="flex-start">
          <SizableText size="$4" color="#6B7280">3.</SizableText>
          <SizableText size="$4" color="#1F2937" flex={1}>You'll receive a payment link via email to pay securely</SizableText>
        </XStack>
        {APP_CONFIG.STORE_EMAIL ? (
          <XStack space="$2" alignItems="flex-start">
            <SizableText size="$4" color="#6B7280">?</SizableText>
            <SizableText
              size="$4" color="#1D4ED8" flex={1}
              onPress={() => Linking.openURL(`mailto:${APP_CONFIG.STORE_EMAIL}`)}
            >
              Questions? Email us at {APP_CONFIG.STORE_EMAIL}
            </SizableText>
          </XStack>
        ) : null}
      </YStack>

      {/* Payment notice */}
      <XStack
        backgroundColor="#DCFCE7"
        borderRadius={12}
        borderWidth={1}
        borderColor="#86EFAC"
        padding="$3"
        space="$2"
        alignItems="center"
        marginBottom="$3"
      >
        <CreditCard size={18} color="#16A34A" />
        <SizableText size="$3" color="#15803D" flex={1}>
          No payment now — you'll receive a secure Stripe link when a driver picks up your order.
        </SizableText>
      </XStack>

      {/* Terms of Use consent — large black highlighted box */}
      <YStack
        backgroundColor="#111827"
        borderRadius={16}
        borderWidth={3}
        borderColor={agreedToTerms ? '#22C55E' : '#9CA3AF'}
        padding="$5"
        space="$3"
        marginBottom="$2"
        shadowColor="#000"
        shadowOpacity={0.3}
        shadowRadius={8}
        shadowOffset={{ width: 0, height: 4 }}
      >
        <SizableText size="$4" fontWeight="800" color="white" marginBottom="$1">
          {agreedToTerms ? '✓ AGREED' : 'AGREE TO CONTINUE'}
        </SizableText>
        <Pressable
          onPress={() => setAgreedToTerms((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 }}
        >
          <View
            style={{
              width: 32, height: 32, borderRadius: 8,
              borderWidth: 2.5,
              borderColor: agreedToTerms ? '#22C55E' : '#6B7280',
              backgroundColor: agreedToTerms ? '#22C55E' : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {agreedToTerms && (
              <SizableText size="$5" fontWeight="900" color="white">✓</SizableText>
            )}
          </View>
          <SizableText size="$4" color="#E5E7EB" flex={1} lineHeight={24}>
            I agree to the{' '}
            <SizableText
              size="$4"
              fontWeight="800"
              color="#22C55E"
              textDecorationLine="underline"
              onPress={(e: any) => { e?.stopPropagation?.(); router.push('/terms'); }}
            >
              Terms of Use
            </SizableText>
            {' '}including the delivery and payment policies.
          </SizableText>
        </Pressable>
      </YStack>

      {!!error && (
        <YStack backgroundColor="#FEE2E2" borderRadius={10} padding="$3" borderWidth={1} borderColor="#FCA5A5" marginBottom="$3">
          <SizableText size="$4" color="#DC2626">{error}</SizableText>
        </YStack>
      )}

      {/* Actions */}
      <YStack space="$3">
        <Pressable
          onPress={agreedToTerms ? onSubmit : undefined}
          disabled={loading || !agreedToTerms}
          style={({ pressed }) => [
            styles.btn,
            pressed && agreedToTerms && styles.btnPressed,
            (loading || !agreedToTerms) && styles.btnDisabled,
          ]}
        >
          {loading ? (
            <XStack space="$2" alignItems="center">
              <ActivityIndicator color="white" size="small" />
              <SizableText size="$5" fontWeight="700" color="white">Placing order…</SizableText>
            </XStack>
          ) : (
            <XStack alignItems="center" space="$2">
              <Truck size={22} color="white" />
              <SizableText size="$6" fontWeight="800" color="white">
                Place Order — {fmt(totalCents)} estimated
              </SizableText>
            </XStack>
          )}
        </Pressable>

        <Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}>
          <XStack alignItems="center" justifyContent="center" space="$2">
            <ChevronLeft size={20} color="#374151" />
            <SizableText size="$4" color="#374151">Edit Details</SizableText>
          </XStack>
        </Pressable>
      </YStack>
    </ScrollView>
  );
}

// ─── Success screen ──────────────────────────────────────────────────────────

interface SuccessProps {
  orderId: string | null;
  totalCents: number;
  onReset: () => void;
}

function SuccessScreen({ orderId, totalCents, onReset }: SuccessProps) {
  return (
    <SafeArea backgroundColor="#FFFFFF">
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" space="$5">
        <YStack width={88} height={88} borderRadius={44} backgroundColor="#DBEAFE" alignItems="center" justifyContent="center">
          <Truck size={50} color="#2563EB" />
        </YStack>
        <YStack alignItems="center" space="$2">
          <SizableText size="$8" fontWeight="800" color="#111827" textAlign="center">Order Placed!</SizableText>
          <SizableText size="$4" color="#374151" textAlign="center">
            A driver will accept your order shortly. You'll receive a payment link when your delivery is picked up.
          </SizableText>
          {orderId && (
            <SizableText size="$3" color="#6B7280" textAlign="center">
              Order #{orderId ? orderId.slice(-6).toUpperCase() : '------'}
            </SizableText>
          )}
        </YStack>

        {/* Total summary */}
        <YStack backgroundColor="#F3F4F6" borderRadius={12} padding="$4" width="100%" alignItems="center">
          <SizableText size="$4" color="#374151">Estimated total</SizableText>
          <SizableText size="$8" fontWeight="800" color="#111827">{fmt(totalCents)}</SizableText>
          <SizableText size="$2" color="#9CA3AF" textAlign="center" marginTop="$1">
            Payment is collected when a driver picks up your order
          </SizableText>
        </YStack>

        <Pressable onPress={onReset} style={({ pressed }) => [styles.btn, { width: '100%', backgroundColor: '#6b7280' }, pressed && styles.btnPressed]}>
          <SizableText size="$5" fontWeight="700" color="white">Request Another Pickup</SizableText>
        </Pressable>
      </YStack>
    </SafeArea>
  );
}

// ─── Root screen ─────────────────────────────────────────────────────────────

const NAME_KEY = 'customer_display_name';

export default function RequestPickupScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Pre-fill name from Profile on first load
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

  const set = (key: keyof FormState) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const goToStep2 = () => {
    setError('');
    const { name, phone, address, deliveryAddress } = form;
    if (!name.trim() || !phone.trim() || !address.trim() || !deliveryAddress.trim()) {
      setError('Please fill in Name, Phone, Pickup Address, and Delivery Address.');
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStep(2);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const sessionId = await getOrCreateSessionId();
      const mileageCents = calcMileageCents(form.miles);

      // Enforce $5 minimum tip (custom or preset)
      const finalTipCents = tipCents < 5_00 ? 5_00 : tipCents;
      const totalCents = DELIVERY_FEE + mileageCents + finalTipCents;

      const orderData = {
        customerName: form.name.trim(),
        customerPhone: form.phone.trim(),
        customerEmail: form.email.trim(),
        pickupAddress: form.address.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        items: `${form.deliveryType === 'meet' ? '[MEET CUSTOMER] ' : '[LEAVE AT DOOR] '}${form.pickupNumber.trim() || 'N/A'}`,
        distanceMiles: parseFloat(form.miles) || 0,
        status: 'pending',
        customerSessionId: sessionId,
        tipAmount: finalTipCents,
        paymentStatus: 'unpaid',
        cityId: APP_CONFIG.CITY_ID,
        storeId: APP_CONFIG.STORE_ID,
        orderScope: ORDER_SCOPE,
      };

      // 1. Create the order — Direct REST first (publishable key works on web/mobile);
      //    SDK `db.create` requires a secret_key on server-to-server routes and a
      //    signed user JWT for user-authenticated routes. The public orders table
      //    accepts the publishable key for unauthenticated creates.
      let result: any = null;
      let lastErr: any = null;

      // Build snake_case payload for the direct REST endpoint
      const snakeData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(orderData)) {
        const snakeKey = key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
        snakeData[snakeKey] = value;
      }

      // Attempt A: Direct REST with publishable key (always works)
      try {
        console.log('[OrderCreate] Direct REST attempt…');
        result = await blinkDbCreate('orders', snakeData);
        console.log(`[OrderCreate] REST success: ${result?.id}`);
      } catch (restErr: any) {
        lastErr = restErr;
        console.error('[OrderCreate] REST failed:', restErr?.message || restErr);
      }

      // Attempt B: SDK fallback (only if REST failed completely)
      if (!result) {
        try {
          console.log('[OrderCreate] SDK fallback attempt…');
          result = await blink.db.orders.create(orderData) as any;
          console.log(`[OrderCreate] SDK success: ${result?.id}`);
        } catch (sdkErr: any) {
          lastErr = sdkErr;
          console.error('[OrderCreate] SDK fallback failed:', sdkErr?.message || sdkErr);
        }
      }

      if (!result && lastErr) {
        throw new Error(`Could not save order: ${lastErr?.message || 'Network error. Please check your connection and try again.'}`);
      }

      const orderId = result?.id;
      setLastOrderId(orderId ?? null);

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // 2. Order created — payment happens when driver picks up
      setSuccess(true);
    } catch (err: any) {
      console.error('[OrderSubmit] Error:', err?.message || err);
      setError(err?.message || 'Something went wrong. Please try again.');
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
    return <SuccessScreen orderId={lastOrderId} totalCents={DELIVERY_FEE + calcMileageCents(form.miles) + tipCents} onReset={handleReset} />;
  }

  return (
    <SafeArea backgroundColor="#FFFFFF">
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
          onBack={() => { setError(''); setStep(1); }}
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
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 18,
    color: '#111827',
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  btn: {
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.5 },
  backBtn: {
    height: 44,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  tipBtnActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  tipBtnPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  customTipInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
});
