import React, { useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  View,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  SafeArea,
  toast,
  CheckCircle,
  PlusCircle,
  User,
  Phone,
  Mail,
  MapPin,
  Navigation,
  Package,
  DollarSign,
  Zap,
} from '@blinkdotnew/mobile-ui';
import { ordersTable, useCreateOrder } from '@/lib/orders';
import { APP_CONFIG, ORDER_SCOPE } from '@/lib/config';
import { blinkDbCreate } from '@/lib/blinkApi';
import * as Haptics from 'expo-haptics';

const BLUE = '#0066FF';
const GOLD = '#F5C400';
const GREEN = '#00E676';
const BG = '#000000';
const CARD_BG = '#0F121C';

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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const mileageCents = calcMileageCents(miles);
  const totalCents = DELIVERY_FEE + mileageCents + tipCents;

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

      toast('Order created', { message: `Order for ${customerName.trim()} added`, variant: 'success' });
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
      toast('Error', { message: e?.message || 'Failed to create order. Please try again.', variant: 'error' });
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
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const TIP_OPTIONS = [500, 1000, 1500, 2000, 2500];

  return (
    <SafeArea>
      <View style={styles.root}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <PlusCircle size={20} color={GOLD} />
            </View>
            <View>
              <Text style={styles.headerTitle}>New Order</Text>
              <Text style={styles.headerSubtitle}>Create a delivery task manually</Text>
            </View>
          </View>

          {/* Test Fill Button */}
          <Pressable
            onPress={fillTestData}
            style={({ pressed }) => [styles.testFillBtn, pressed && { opacity: 0.75 }]}
          >
            <Zap size={12} color={GOLD} />
            <Text style={styles.testFillText}>Fill Test</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Card 1: Customer Info ── */}
            <View style={styles.card}>
              <LinearGradient
                colors={['#181C28', '#121520', '#0C0E16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.cardGradient}
              >
                <Text style={styles.cardTitle}>CUSTOMER DETAILS</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>NAME *</Text>
                  <View style={[styles.inputBox, focusedField === 'name' && styles.inputBoxFocused]}>
                    <User size={16} color={focusedField === 'name' ? GOLD : 'rgba(255,255,255,0.4)'} />
                    <TextInput
                      value={customerName}
                      onChangeText={setCustomerName}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. Maria Lopez"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      autoCapitalize="words"
                      style={[styles.input, webNoOutline]}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>PHONE *</Text>
                  <View style={[styles.inputBox, focusedField === 'phone' && styles.inputBoxFocused]}>
                    <Phone size={16} color={focusedField === 'phone' ? GOLD : 'rgba(255,255,255,0.4)'} />
                    <TextInput
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. (520) 555-0101"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="phone-pad"
                      style={[styles.input, webNoOutline]}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>EMAIL (OPTIONAL)</Text>
                  <View style={[styles.inputBox, focusedField === 'email' && styles.inputBoxFocused]}>
                    <Mail size={16} color={focusedField === 'email' ? GOLD : 'rgba(255,255,255,0.4)'} />
                    <TextInput
                      value={customerEmail}
                      onChangeText={setCustomerEmail}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="For delivery notification email"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={[styles.input, webNoOutline]}
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* ── Card 2: Route & Addresses ── */}
            <View style={styles.card}>
              <LinearGradient
                colors={['#181C28', '#121520', '#0C0E16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.cardGradient}
              >
                <Text style={styles.cardTitle}>ROUTE & ITEMS</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>PICKUP ADDRESS</Text>
                  <View
                    style={[
                      styles.inputBox,
                      APP_CONFIG.LOCK_PICKUP_ADDRESS && styles.inputBoxLocked,
                      focusedField === 'pickup' && !APP_CONFIG.LOCK_PICKUP_ADDRESS && styles.inputBoxFocused,
                    ]}
                  >
                    <MapPin size={16} color={GOLD} />
                    <TextInput
                      value={pickupAddress}
                      onChangeText={APP_CONFIG.LOCK_PICKUP_ADDRESS ? undefined : setPickupAddress}
                      onFocus={() => setFocusedField('pickup')}
                      onBlur={() => setFocusedField(null)}
                      editable={!APP_CONFIG.LOCK_PICKUP_ADDRESS}
                      placeholder="Where to pick up"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      autoCapitalize="words"
                      style={[styles.input, webNoOutline]}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>DELIVERY ADDRESS *</Text>
                  <View style={[styles.inputBox, focusedField === 'delivery' && styles.inputBoxFocused]}>
                    <Navigation size={16} color={focusedField === 'delivery' ? GOLD : BLUE} />
                    <TextInput
                      value={deliveryAddress}
                      onChangeText={setDeliveryAddress}
                      onFocus={() => setFocusedField('delivery')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Where to drop off"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      autoCapitalize="words"
                      style={[styles.input, webNoOutline]}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>ORDER ITEMS *</Text>
                  <View
                    style={[
                      styles.inputBox,
                      styles.inputBoxMultiline,
                      focusedField === 'items' && styles.inputBoxFocused,
                    ]}
                  >
                    <Package
                      size={16}
                      color={focusedField === 'items' ? GOLD : 'rgba(255,255,255,0.4)'}
                      style={{ marginTop: 2 }}
                    />
                    <TextInput
                      value={items}
                      onChangeText={setItems}
                      onFocus={() => setFocusedField('items')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. 2 grocery bags, electronics, clothing..."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      multiline
                      numberOfLines={3}
                      autoCapitalize="sentences"
                      style={[styles.input, styles.multilineInput, webNoOutline]}
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* ── Card 3: Pricing & Tip Selection ── */}
            <View style={styles.card}>
              <LinearGradient
                colors={['#181C28', '#121520', '#0C0E16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.cardGradient}
              >
                <Text style={styles.cardTitle}>PRICING & DRIVER TIP</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    DISTANCE (MILES) · free up to {FREE_MILES} mi
                  </Text>
                  <View style={[styles.inputBox, focusedField === 'miles' && styles.inputBoxFocused]}>
                    <Navigation size={16} color={focusedField === 'miles' ? GOLD : 'rgba(255,255,255,0.4)'} />
                    <TextInput
                      value={miles}
                      onChangeText={setMiles}
                      onFocus={() => setFocusedField('miles')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. 4.5"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="decimal-pad"
                      style={[styles.input, webNoOutline]}
                    />
                    {mileageCents > 0 && (
                      <View style={styles.mileagePill}>
                        <Text style={styles.mileageText}>+{fmt(mileageCents)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Driver Tip Pills */}
                <View style={styles.fieldGroup}>
                  <View style={styles.tipHeaderRow}>
                    <Text style={styles.fieldLabel}>DRIVER TIP</Text>
                    <Text style={styles.tipCurrentAmount}>{fmt(tipCents)}</Text>
                  </View>
                  <View style={styles.tipPillsRow}>
                    {TIP_OPTIONS.map((t) => (
                      <Pressable
                        key={t}
                        onPress={() => {
                          setTipCents(t);
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        }}
                        style={[
                          styles.tipPill,
                          tipCents === t && styles.tipPillActive,
                        ]}
                      >
                        <Text style={[styles.tipPillText, tipCents === t && styles.tipPillTextActive]}>
                          {fmt(t)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Total Summary Row */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Due on Pickup</Text>
                  <Text style={styles.totalAmount}>{fmt(totalCents)}</Text>
                </View>
              </LinearGradient>
            </View>

            {/* ── Submit Button ── */}
            <Pressable
              onPress={handleCreateOrder}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitBtnWrapper,
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                loading && { opacity: 0.5 },
              ]}
            >
              <LinearGradient
                colors={['#1E75FF', '#0066FF', '#004ECC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <CheckCircle size={18} color="white" />
                    <Text style={styles.submitText}>CREATE ORDER</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeArea>
  );
}

const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E2230',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 1,
  },
  testFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 196, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 0, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  testFillText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  /* Cards */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
    width: '100%',
    gap: 14,
  },
  cardTitle: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  /* Fields */
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#121520',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    height: 48,
  },
  inputBoxFocused: {
    borderColor: '#F5C400',
    borderWidth: 1.5,
  },
  inputBoxMultiline: {
    height: 80,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  inputBoxLocked: {
    backgroundColor: 'rgba(245, 196, 0, 0.04)',
    borderColor: 'rgba(245, 196, 0, 0.25)',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '500',
    height: '100%',
  },
  multilineInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  mileagePill: {
    backgroundColor: 'rgba(245, 196, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mileageText: {
    color: GOLD,
    fontSize: 11.5,
    fontWeight: '800',
  },

  /* Tips */
  tipHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipCurrentAmount: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '800',
  },
  tipPillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tipPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#141824',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tipPillActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  tipPillText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '800',
  },
  tipPillTextActive: {
    color: '#FFFFFF',
  },

  /* Total Summary */
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
  },
  totalLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13.5,
    fontWeight: '600',
  },
  totalAmount: {
    color: GOLD,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  /* Submit Button */
  submitBtnWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 4,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

