import React, { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  toast,
  CheckCircle,
  PlusCircle,
  User,
  Phone,
  MapPin,
  Navigation,
  Package,
  DollarSign,
} from '@blinkdotnew/mobile-ui';
import { ordersTable, useCreateOrder } from '@/lib/orders';
import { APP_CONFIG, ORDER_SCOPE } from '@/lib/config';
import { blink } from '@/lib/blink';
import { blinkDbCreate } from '@/lib/blinkApi';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '@/constants/design';

const DELIVERY_FEE = APP_CONFIG.DELIVERY_FEE_CENTS;
const MILEAGE_RATE = APP_CONFIG.MILEAGE_RATE_CENTS;
const FREE_MILES = APP_CONFIG.FREE_MILES;

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function calcMileageCents(milesStr: string): number {
  const miles = parseFloat(milesStr);
  if (!isFinite(miles) || miles <= FREE_MILES) return 0;
  return Math.round((miles - FREE_MILES) * MILEAGE_RATE);
}

export default function NewOrderScreen() {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [pickupAddress, setPickupAddress] = useState(APP_CONFIG.LOCK_PICKUP_ADDRESS ? APP_CONFIG.STORE_ADDRESS : '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [items, setItems] = useState('');
  const [miles, setMiles] = useState('');
  const [tipCents, setTipCents] = useState(500);
  const [loading, setLoading] = useState(false);

  const mileageCents = calcMileageCents(miles);
  const totalCents = DELIVERY_FEE + mileageCents + tipCents;

  const createOrder = useCreateOrder();

  const handleCreateOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim() || !items.trim()) {
      toast('Missing fields', { message: 'Name, phone, delivery address and items are required', variant: 'error' });
      return;
    }
    if (tipCents < 500) {
      toast('Tip required', { message: 'Minimum tip is $5.00', variant: 'error' });
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

      // Direct REST first (publishable key works without auth); SDK fallback.
      const snakeData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(orderData)) {
        snakeData[key] = value; // already snake_case here
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

      toast('Order created', { message: `Order for ${customerName.trim()} added`, variant: 'success' });
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setPickupAddress(APP_CONFIG.LOCK_PICKUP_ADDRESS ? APP_CONFIG.STORE_ADDRESS : '');
      setDeliveryAddress('');
      setItems('');
      setMiles('');
      setTipCents(0);
      router.push('/(tabs)');
    } catch (e: any) {
      console.error('[new-order] Create failed:', e?.message || e);
      toast('Error', { message: e?.message || 'Failed to create order. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const TIP_OPTIONS = [5_00, 10_00, 15_00, 20_00, 25_00];

  return (
    <SafeArea>
      <LinearGradient
        colors={[APP_CONFIG.GRADIENT_START, APP_CONFIG.GRADIENT_MID, APP_CONFIG.GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}
      >
        <XStack space="$3" alignItems="center">
          <YStack
            width={44} height={44} borderRadius={22}
            backgroundColor="rgba(0,0,0,0.25)"
            alignItems="center" justifyContent="center"
            borderWidth={1.5} borderColor="rgba(255,255,255,0.3)"
          >
            <PlusCircle size={24} color="white" />
          </YStack>
          <YStack>
            <SizableText size="$7" fontWeight="900" color="white" letterSpacing={-0.5}>
              New Order
            </SizableText>
            <SizableText size="$2" color="rgba(255,255,255,0.7)">
              Add a delivery task manually
            </SizableText>
          </YStack>
        </XStack>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <YStack space="$5">

            {/* Test fill */}
            <XStack justifyContent="flex-end" marginBottom={-8}>
              <Pressable
                onPress={() => {
                  setCustomerName('Jamie Test');
                  setCustomerPhone('(520) 555-1234');
                  setCustomerEmail('test@example.com');
                  setPickupAddress('5765 S Camino del Sol, Green Valley, AZ 85622');
                  setDeliveryAddress('123 E Test Ave, Sahuarita, AZ 85629');
                  setItems('#1042 — grocery order');
                  setMiles('3.5');
                  setTipCents(10_00);
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
                <SizableText size="$1" fontWeight="700" color="$blue9">⚡ Fill test data</SizableText>
              </Pressable>
            </XStack>

            {/* Customer */}
            <YStack space="$3">
              <SizableText size="$3" fontWeight="700" color="$color10">CUSTOMER</SizableText>

              <Field label="NAME *" icon={<User size={16} color="$color9" />}>
                <TextInput value={customerName} onChangeText={setCustomerName}
                  placeholder="e.g. Maria Lopez" placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words" style={[styles.input, webNoOutline]} />
              </Field>

              <Field label="PHONE *" icon={<Phone size={16} color="$color9" />}>
                <TextInput value={customerPhone} onChangeText={setCustomerPhone}
                  placeholder="e.g. (520) 555-0101" placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad" style={[styles.input, webNoOutline]} />
              </Field>

              <Field label="EMAIL (optional)" icon={<Package size={16} color="$color9" />}>
                <TextInput value={customerEmail} onChangeText={setCustomerEmail}
                  placeholder="For delivery notification email"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address" autoCapitalize="none"
                  style={[styles.input, webNoOutline]} />
              </Field>
            </YStack>

            {/* Addresses */}
            <YStack space="$3">
              <SizableText size="$3" fontWeight="700" color="$color10">ADDRESSES</SizableText>

              <Field label="PICKUP ADDRESS" icon={<MapPin size={16} color="$color9" />}
                locked={APP_CONFIG.LOCK_PICKUP_ADDRESS}>
                <TextInput value={pickupAddress} onChangeText={APP_CONFIG.LOCK_PICKUP_ADDRESS ? undefined : setPickupAddress}
                  editable={!APP_CONFIG.LOCK_PICKUP_ADDRESS}
                  placeholder="Where to pick up"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words" style={[styles.input, webNoOutline]} />
              </Field>

              <Field label="DELIVERY ADDRESS *" icon={<Navigation size={16} color="$color9" />}>
                <TextInput value={deliveryAddress} onChangeText={setDeliveryAddress}
                  placeholder="Where to drop off"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words" style={[styles.input, webNoOutline]} />
              </Field>
            </YStack>

            {/* Items */}
            <YStack space="$1">
              <SizableText size="$2" fontWeight="700" color="$color10">ITEMS *</SizableText>
              <XStack backgroundColor="$color3" borderRadius={14} borderWidth={1}
                borderColor="$color5" paddingHorizontal="$4" paddingVertical="$2" space="$2" alignItems="flex-start">
                <Package size={16} color="$color9" style={{ marginTop: 4 }} />
                <TextInput value={items} onChangeText={setItems}
                  placeholder="e.g. 2 grocery bags, electronics, clothing..."
                  placeholderTextColor={colors.textTertiary}
                  multiline numberOfLines={3} autoCapitalize="sentences"
                  style={[styles.input, styles.multiline, webNoOutline]} />
              </XStack>
            </YStack>

            {/* Distance + pricing */}
            <YStack space="$3">
              <SizableText size="$3" fontWeight="700" color="$color10">PRICING</SizableText>

              <Field label={`DISTANCE (miles) · free up to ${FREE_MILES} mi`} icon={<Navigation size={16} color="$color9" />}>
                <TextInput value={miles} onChangeText={setMiles}
                  placeholder="e.g. 4.5"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad" style={[styles.input, webNoOutline]} />
                {mileageCents > 0 && (
                  <SizableText size="$2" color="$amber9" fontWeight="600">+{fmt(mileageCents)}</SizableText>
                )}
              </Field>

              {/* Tip selector */}
              <YStack space="$2">
                <XStack justifyContent="space-between">
                  <SizableText size="$2" fontWeight="700" color="$color10">DRIVER TIP</SizableText>
                  <SizableText size="$2" color="$green9" fontWeight="700">{fmt(tipCents)}</SizableText>
                </XStack>
                <XStack space="$2" flexWrap="wrap">
                  {TIP_OPTIONS.map((t) => (
                    <Pressable key={t} onPress={() => setTipCents(t)}
                      style={[styles.tipBtn, tipCents === t && styles.tipBtnActive]}>
                      <SizableText size="$2" fontWeight="700" color={tipCents === t ? 'white' : '$color11'}>
                        {fmt(t)}
                      </SizableText>
                    </Pressable>
                  ))}
                </XStack>
              </YStack>

              {/* Total */}
              <XStack backgroundColor="$color3" borderRadius={12} padding="$3" justifyContent="space-between" alignItems="center">
                <SizableText size="$3" color="$color10" fontWeight="600">Total due on pickup</SizableText>
                <SizableText size="$5" fontWeight="800" color="$color12">{fmt(totalCents)}</SizableText>
              </XStack>
            </YStack>

            {/* Submit */}
            <Pressable onPress={handleCreateOrder} disabled={loading}
              style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, loading && { opacity: 0.5 }]}>
              {loading
                ? <ActivityIndicator color="white" />
                : (
                  <XStack space="$2" alignItems="center">
                    <CheckCircle size={20} color="white" />
                    <SizableText size="$5" fontWeight="800" color="white">CREATE ORDER</SizableText>
                  </XStack>
                )}
            </Pressable>

          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

function Field({ label, icon, children, locked }: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <YStack space="$1">
      <SizableText size="$2" fontWeight="700" color="$color10">{label}</SizableText>
      <XStack
        alignItems="center"
        backgroundColor={locked ? 'rgba(204,0,0,0.07)' : '$color3'}
        borderRadius={14} borderWidth={1}
        borderColor={locked ? 'rgba(204,0,0,0.3)' : '$color5'}
        paddingHorizontal="$4" space="$2"
      >
        {icon}
        {children}
      </XStack>
    </YStack>
  );
}

const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: colors.text,
  },
  multiline: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  tipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  tipBtnActive: {
    backgroundColor: APP_CONFIG.PRIMARY_COLOR,
    borderColor: APP_CONFIG.PRIMARY_COLOR,
  },
  submitBtn: {
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: APP_CONFIG.PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  submitBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
