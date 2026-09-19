import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Linking,
  Platform,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { CustomCard, CustomConfirmModal } from '@/components/core';
import { APP_CONFIG } from '@/lib/config';
import { createCheckoutForOrder, openCheckoutUrl } from '@/apis/checkout';
import { ordersApi } from '@/apis/orders';
import { useOrderStore } from '@/store/useOrderStore';
import { useResponsive } from '@/hooks/useResponsive';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  }
}

const DELIVERY_FEE = APP_CONFIG.DELIVERY_FEE_CENTS;
const MILEAGE_FREE_MILES = APP_CONFIG.FREE_MILES;
const MILEAGE_RATE_CENTS = APP_CONFIG.MILEAGE_RATE_CENTS;

function calcMileageCents(miles?: number): number {
  const m = Number(miles ?? 0);
  if (!m || m <= MILEAGE_FREE_MILES) return 0;
  return Math.round((m - MILEAGE_FREE_MILES) * MILEAGE_RATE_CENTS);
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Just now';
  const timestamp = new Date(dateStr).getTime();
  if (isNaN(timestamp)) return 'Recently';

  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export type OrderStatusVariant =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'shopping'
  | 'picked_up'
  | 'en_route'
  | 'delivered'
  | 'cancelled';

export interface CustomerOrderData {
  id: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  customer_email?: string;
  customerEmail?: string;
  pickup_address?: string;
  pickupAddress?: string;
  delivery_address?: string;
  deliveryAddress?: string;
  items?: string;
  status: OrderStatusVariant;
  created_at?: string;
  createdAt?: string;
  tip_amount?: number;
  tipAmount?: number;
  payment_status?: string;
  paymentStatus?: string;
  distance_miles?: number;
  distanceMiles?: number;
  amount_cents?: number;
  amountCents?: number;
  driver_name?: string;
  driverName?: string;
  driver_photo_url?: string;
  deliveryPhotoUrl?: string;
  delivery_photo_url?: string;
  customerSessionId?: string;
  customer_session_id?: string;
  requires_id_verification?: boolean;
  requiresIdVerification?: boolean;
  hasAlcohol?: boolean;
  id_verification_type?: 'alcohol' | 'medication' | 'id';
  idVerificationType?: 'alcohol' | 'medication' | 'id';
  minimum_age?: number;
  minimumAge?: number;
  age_verified?: boolean;
  ageVerified?: boolean;
}

export interface CustomerOrderCardProps {
  order: CustomerOrderData;
  variant?: OrderStatusVariant;
  onPress?: () => void;
  onCancel?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function CustomerOrderCard({
  order: propOrder,
  variant,
  onPress,
  onCancel,
  style,
}: CustomerOrderCardProps) {
  const { select } = useResponsive();
  const [expanded, setExpanded] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);

  // Subscribe directly to Zustand store for instant real-time status & payment reactivity
  const storeOrder = useOrderStore((state) =>
    state.orders.find((o) => o.id === propOrder.id)
  );
  const order = storeOrder ? ({ ...propOrder, ...storeOrder } as CustomerOrderData) : propOrder;

  const currentStatus: OrderStatusVariant =
    variant || (order.status as OrderStatusVariant) || 'pending';
  const shortId = order.id ? order.id.slice(-6).toUpperCase() : '------';

  const customerName = order.customerName || order.customer_name || 'Customer Order';
  const customerPhone = order.customerPhone || order.customer_phone || '';
  const pickupAddress = order.pickupAddress || order.pickup_address || APP_CONFIG.STORE_ADDRESS || 'Store Pickup';
  const deliveryAddress = order.deliveryAddress || order.delivery_address || '—';
  const createdAt = order.createdAt || order.created_at;

  const miles = Number(order.distanceMiles ?? order.distance_miles ?? 0);
  const tipAmount = Number(order.tipAmount ?? order.tip_amount ?? 0);
  const mileageCents = calcMileageCents(miles);
  const totalCents = DELIVERY_FEE + mileageCents + tipAmount;
  const hasMileageSurcharge = mileageCents > 0;

  const isPending = currentStatus === 'pending';
  const isPickedUp = currentStatus === 'picked_up' || currentStatus === 'en_route' || currentStatus === 'shopping';
  const isDelivered = currentStatus === 'delivered';
  const driverName = order.driverName || order.driver_name;

  const initial = (customerName?.trim() || 'C').charAt(0).toUpperCase();

  const [paying, setPaying] = useState(false);

  const isAcceptedOrBeyond = currentStatus !== 'pending';

  const isDevBypassed =
    order.payment_status === 'dev_bypassed' ||
    order.paymentStatus === 'dev_bypassed' ||
    (storeOrder as any)?.paymentStatus === 'dev_bypassed' ||
    (storeOrder as any)?.payment_status === 'dev_bypassed';

  const isPaid =
    (isDevBypassed && isAcceptedOrBeyond) ||
    order.payment_status === 'paid' ||
    order.payment_status === 'test_paid' ||
    order.paymentStatus === 'paid' ||
    order.paymentStatus === 'test_paid' ||
    (storeOrder as any)?.paymentStatus === 'paid' ||
    (storeOrder as any)?.paymentStatus === 'test_paid' ||
    (storeOrder as any)?.payment_status === 'paid' ||
    (storeOrder as any)?.payment_status === 'test_paid';
  const isChargeable =
    currentStatus !== 'pending' &&
    currentStatus !== 'assigned' &&
    currentStatus !== 'cancelled';
  const needsPayment = isChargeable && !isPaid && !isDevBypassed;

  const handlePayNow = async () => {
    if (paying) return;
    haptic();
    setPaying(true);
    try {
      const res = await createCheckoutForOrder(order.id, {
        amountCents: totalCents,
        customerEmail: order.customerEmail || order.customer_email,
        testMode: true,
      });
      if (res?.url) {
        const paidSuccess = await openCheckoutUrl(res.url, order.id);
        if (paidSuccess) {
          setShowPaymentSuccessModal(true);
          useOrderStore.getState().updateOrder(order.id, {
            paymentStatus: 'paid',
            payment_status: 'paid',
          });
        }
        try {
          const latest = await ordersApi.getById(order.id);
          if (latest && latest.id) {
            useOrderStore.getState().upsertOrder({
              ...latest,
              paymentStatus: paidSuccess ? 'paid' : (latest.paymentStatus || 'unpaid'),
              payment_status: paidSuccess ? 'paid' : ((latest as any).payment_status || 'unpaid'),
            });
          }
        } catch { }
        setTimeout(async () => {
          try {
            const latest = await ordersApi.getById(order.id);
            if (latest && latest.id) {
              useOrderStore.getState().upsertOrder({
                ...latest,
                paymentStatus: paidSuccess ? 'paid' : (latest.paymentStatus || 'unpaid'),
                payment_status: paidSuccess ? 'paid' : ((latest as any).payment_status || 'unpaid'),
              });
            }
          } catch { }
        }, 700);
      } else {
        Alert.alert('Payment', res?.error || 'Could not create checkout session. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Payment Error', err?.message || 'Failed to initiate checkout.');
    } finally {
      setPaying(false);
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'assigned':
      case 'accepted':
        return {
          label: 'DRIVER ON WAY',
          icon: 'directions-car' as const,
          color: '#3B82F6',
          bg: 'rgba(59, 130, 246, 0.14)',
          border: 'rgba(59, 130, 246, 0.35)',
        };
      case 'shopping':
        return {
          label: 'SHOPPING',
          icon: 'shopping-bag' as const,
          color: '#FFE399',
          bg: 'rgba(255, 227, 153, 0.14)',
          border: 'rgba(255, 227, 153, 0.35)',
        };
      case 'picked_up':
      case 'en_route':
        return {
          label: 'OUT FOR DELIVERY',
          icon: 'near-me' as const,
          color: '#F4C300',
          bg: 'rgba(244, 195, 0, 0.14)',
          border: 'rgba(244, 195, 0, 0.35)',
        };
      case 'delivered':
        return {
          label: 'DELIVERED',
          icon: 'check-circle' as const,
          color: '#00E297',
          bg: 'rgba(0, 226, 151, 0.14)',
          border: 'rgba(0, 226, 151, 0.35)',
        };
      case 'cancelled':
        return {
          label: 'CANCELLED',
          icon: 'cancel' as const,
          color: '#FF6B6B',
          bg: 'rgba(255, 107, 107, 0.14)',
          border: 'rgba(255, 107, 107, 0.35)',
        };
      case 'pending':
      default:
        return {
          label: 'PENDING',
          icon: 'schedule' as const,
          color: '#F4C300',
          bg: 'rgba(244, 195, 0, 0.12)',
          border: 'rgba(244, 195, 0, 0.3)',
        };
    }
  };

  const badge = getStatusBadge();

  const requiresId = !!(
    order.requiresIdVerification ||
    order.requires_id_verification ||
    order.hasAlcohol
  );
  const isMedication =
    order.idVerificationType === 'medication' ||
    order.id_verification_type === 'medication';
  const isIdVerified = !!(order.ageVerified || order.age_verified);

  const parsedItems = (() => {
    let text = order.items || '';
    const idBadges: { label: string; icon?: any; color: string; bg: string; border: string }[] = [];
    let deliveryTag: { label: string; icon?: any; color: string; bg: string; border: string } | null = null;

    // 1. Delivery Mode Tag (e.g. Leave at Door / Meet at Door)
    if (text.includes('[LEAVE AT DOOR]')) {
      deliveryTag = {
        label: 'Leave at Door',
        icon: 'meeting-room',
        color: '#FFE399',
        bg: 'rgba(255, 227, 153, 0.12)',
        border: 'rgba(255, 227, 153, 0.28)',
      };
      text = text.replace(/\[LEAVE AT DOOR\]\s*/g, '');
    } else if (text.includes('[MEET AT DOOR]')) {
      deliveryTag = {
        label: 'Meet at Door',
        icon: 'people',
        color: '#00E297',
        bg: 'rgba(0, 226, 151, 0.12)',
        border: 'rgba(0, 226, 151, 0.28)',
      };
      text = text.replace(/\[MEET AT DOOR\]\s*/g, '');
    }

    // 2. ID Verification Requirement Tag (21+ ID or RX ID)
    if (requiresId || text.includes('[21+ ALCOHOL ID REQUIRED]') || text.includes('[21+ALCOHOL ID REQUIRED]')) {
      idBadges.push({
        label: isMedication ? 'RX ID' : '21+ ID',
        icon: isMedication ? 'medical-services' : 'wine-bar',
        color: isMedication ? '#B388FF' : '#FF7B7B',
        bg: isMedication ? 'rgba(179, 136, 255, 0.14)' : 'rgba(255, 107, 107, 0.14)',
        border: isMedication ? 'rgba(179, 136, 255, 0.35)' : 'rgba(255, 107, 107, 0.35)',
      });
      text = text.replace(/\[21\+?\s*ALCOHOL ID REQUIRED\]\s*/gi, '');
    }

    // 3. ID Verified Status Tag
    if (isIdVerified) {
      idBadges.push({
        label: 'ID Verified',
        icon: 'verified',
        color: '#00E297',
        bg: 'rgba(0, 226, 151, 0.14)',
        border: 'rgba(0, 226, 151, 0.35)',
      });
    }

    // 4. Other bracket tags
    const otherBracket = text.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (otherBracket) {
      idBadges.push({
        label: otherBracket[1],
        color: '#B3C5FF',
        bg: 'rgba(0, 102, 255, 0.12)',
        border: 'rgba(0, 102, 255, 0.28)',
      });
      text = otherBracket[2] || '';
    }

    return {
      cleanText: text.trim() || order.items || 'Standard Order',
      idBadges,
      deliveryTag,
    };
  })();

  // Header: Clean top row containing Customer Profile and Main Order Status ONLY
  const headerNode = (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userTextCol}>
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
            {customerName}
          </Text>
          <Text style={styles.orderId} numberOfLines={1} ellipsizeMode="tail">
            #{shortId} · {formatRelativeTime(createdAt)}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.statusBadge,
          { backgroundColor: badge.bg, borderColor: badge.border },
        ]}
      >
        <MaterialIcons name={badge.icon} size={13} color={badge.color} />
        <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
      </View>
    </View>
  );

  const navigateToTrack = () => {
    haptic();
    router.push({
      pathname: `/(customer)/track/${order.id}`,
      params: {
        deliveryAddress: order.deliveryAddress || order.delivery_address || '123 E Test Ave, Sahuarita, AZ 85629',
        pickupAddress: order.pickupAddress || order.pickup_address || APP_CONFIG.STORE_ADDRESS,
        customerName: customerName,
        customerPhone: customerPhone,
        customerEmail: order.customerEmail || order.customer_email || '',
        items: order.items || '',
        status: currentStatus,
        distanceMiles: (order.distanceMiles ?? order.distance_miles ?? '').toString(),
        tipAmount: (order.tipAmount ?? order.tip_amount ?? '').toString(),
        amountCents: (order.amountCents ?? order.amount_cents ?? '').toString(),
      },
    } as any);
  };

  const footerNode = (
    <View style={styles.footer}>
      {driverName && !isDelivered && (
        <View style={styles.driverBanner}>
          <View style={styles.driverAvatar}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#00E297' }}>
              {(driverName || 'D').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.driverNameText}>{driverName}</Text>
            <Text style={styles.driverStatusText}>
              {isPickedUp ? 'Package picked up · Heading to you' : 'Driver assigned · Heading to store'}
            </Text>
          </View>
        </View>
      )}

      {/* Price & Details Bar */}
      <View style={styles.priceRow}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>{fmt(totalCents)}</Text>
          {isPaid ? (
            <View style={styles.paidChip}>
              <MaterialIcons name="check-circle" size={13} color="#00E297" />
              <Text style={styles.paidChipText}>{isDevBypassed ? 'Dev-Pass' : 'Paid'}</Text>
            </View>
          ) : (
            <View style={styles.paymentTag}>
              <Text style={styles.paymentTagText}>Pay on Pickup</Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={() => {
            haptic();
            setExpanded((v) => !v);
          }}
          style={styles.detailsToggle}
        >
          <Text style={styles.detailsToggleText}>
            {expanded ? 'Hide Details' : 'View Details'}
          </Text>
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={18}
            color="#A4A8BC"
          />
        </Pressable>
      </View>

      {/* Expandable Breakdown Drawer */}
      {expanded && (
        <View style={styles.breakdownDrawer}>
          <Text style={styles.breakdownHeader}>PRICE BREAKDOWN</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base delivery fee</Text>
            <Text style={styles.breakdownValue}>{fmt(DELIVERY_FEE)}</Text>
          </View>
          {hasMileageSurcharge && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Mileage ({(miles - MILEAGE_FREE_MILES).toFixed(1)} mi surcharge)
              </Text>
              <Text style={[styles.breakdownValue, { color: '#F4C300' }]}>
                {fmt(mileageCents)}
              </Text>
            </View>
          )}
          {tipAmount > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Driver tip</Text>
              <Text style={[styles.breakdownValue, { color: '#00E297' }]}>{fmt(tipAmount)}</Text>
            </View>
          )}
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownTotalLabel}>Estimated Total</Text>
            <Text style={styles.breakdownTotalValue}>{fmt(totalCents)}</Text>
          </View>
        </View>
      )}

      {/* Action Buttons Section (Old single-row style restored) */}
      <View style={styles.actionsContainer}>
        {needsPayment && (
          <TouchableOpacity
            onPress={handlePayNow}
            disabled={paying}
            activeOpacity={0.85}
            style={styles.payButton}
          >
            {paying ? (
              <ActivityIndicator size="small" color="#0F131C" />
            ) : (
              <>
                <MaterialIcons name="payment" size={16} color="#0F131C" />
                <Text style={styles.payButtonText} numberOfLines={1}>
                  Pay {fmt(totalCents)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {!isDelivered ? (
          <TouchableOpacity
            onPress={navigateToTrack}
            activeOpacity={0.85}
            style={styles.trackButton}
          >
            <MaterialIcons name="near-me" size={16} color="#FFFFFF" />
            <Text style={styles.trackButtonText} numberOfLines={1}>
              Track
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={navigateToTrack}
            activeOpacity={0.85}
            style={styles.deliveredBadgeButton}
          >
            <MaterialIcons name="check-circle" size={16} color="#00E297" />
            <Text style={styles.deliveredBadgeText} numberOfLines={1}>
              Delivered
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            haptic();
            Linking.openURL(`mailto:${APP_CONFIG.STORE_EMAIL}`);
          }}
          activeOpacity={0.85}
          style={styles.supportButton}
        >
          <Ionicons name="headset-outline" size={16} color="#B388FF" />
          <Text style={styles.supportButtonText} numberOfLines={1}>
            Support
          </Text>
        </TouchableOpacity>

        {isPending && onCancel ? (
          <TouchableOpacity
            onPress={() => {
              haptic();
              onCancel(order.id);
            }}
            activeOpacity={0.85}
            style={styles.cancelButton}
          >
            <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
            <Text style={styles.cancelButtonText} numberOfLines={1}>
              Cancel
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <CustomCard
      variant="glass"
      header={headerNode}
      footer={footerNode}
      onPress={onPress || navigateToTrack}
      style={[
        styles.cardContainer,
        { marginHorizontal: select(16, 12, 8) },
        style,
      ]}
    >
      {/* 1. TOP: Order Items & Badges Card */}
      <View style={styles.itemsCard}>
        {/* Top Header Row: Title on Left, Leave at Door on Right */}
        <View style={styles.itemsHeaderRow}>
          <View style={styles.itemsTitleLeft}>
            <View style={styles.itemsIconBox}>
              <MaterialIcons name="inventory-2" size={13} color="#FFE399" />
            </View>
            <Text style={styles.itemsSectionTitle}>ORDER ITEMS</Text>
          </View>

          {/* Leave at Door / Delivery tag on top right */}
          {parsedItems.deliveryTag && (
            <View
              style={[
                styles.deliveryInstructionPill,
                {
                  backgroundColor: parsedItems.deliveryTag.bg,
                  borderColor: parsedItems.deliveryTag.border,
                },
              ]}
            >
              <MaterialIcons
                name={parsedItems.deliveryTag.icon}
                size={11}
                color={parsedItems.deliveryTag.color}
              />
              <Text
                style={[
                  styles.deliveryInstructionText,
                  { color: parsedItems.deliveryTag.color },
                ]}
              >
                {parsedItems.deliveryTag.label}
              </Text>
            </View>
          )}
        </View>

        {/* Content Row: Item Text on Left, 21+ ID & Verified Badges on Bottom Right */}
        <View style={styles.itemsContentRow}>
          <Text style={styles.itemsBodyText} numberOfLines={2}>
            {parsedItems.cleanText}
          </Text>

          {/* ID Badges (21+ ID & ID Verified) on bottom right */}
          {parsedItems.idBadges.length > 0 && (
            <View style={styles.idBadgesRow}>
              {parsedItems.idBadges.map((b, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.itemTagPill,
                    { backgroundColor: b.bg, borderColor: b.border },
                  ]}
                >
                  {b.icon && <MaterialIcons name={b.icon} size={11} color={b.color} />}
                  <Text style={[styles.itemTagText, { color: b.color }]}>{b.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* 2. SECOND: Location & Route Timeline */}
      <View style={styles.routesContainer}>
        {/* Pickup Location */}
        <View style={styles.routeItem}>
          <View style={styles.routeIconBoxPickup}>
            <MaterialIcons name="store" size={15} color="#FFE399" />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={styles.routeLabelPickup}>PICK UP FROM</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>
              {pickupAddress}
            </Text>
          </View>
        </View>

        {/* Connecting Track Line */}
        <View style={styles.routeLineContainer}>
          <View style={styles.connectingLine} />
        </View>

        {/* Delivery Location */}
        <View style={styles.routeItem}>
          <View style={styles.routeIconBoxDelivery}>
            <MaterialIcons name="navigation" size={15} color="#00E297" />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={styles.routeLabelDelivery}>DELIVER TO</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>
              {deliveryAddress}
            </Text>
          </View>
        </View>
      </View>

      <CustomConfirmModal
        visible={showPaymentSuccessModal}
        variant="success"
        title="Payment Successful"
        message="Your payment was processed successfully. Thank you!"
        confirmText="Got It"
        singleButton
        orderId={order.id}
        onClose={() => setShowPaymentSuccessModal(false)}
        onConfirm={() => setShowPaymentSuccessModal(false)}
      />
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#101420',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 227, 153, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFE399',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarText: {
    color: '#FFE399',
    fontSize: 16,
    fontWeight: '800',
  },
  userTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  orderId: {
    color: '#8C90A1',
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  itemsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
    marginTop: 2,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemsTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  itemsIconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFE399',
    letterSpacing: 0.8,
  },
  idBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flexShrink: 1,
  },
  itemTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  itemTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  itemsContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemsBodyText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deliveryInstructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: 'center',
  },
  deliveryInstructionText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  routesContainer: {
    flexDirection: 'column',
    gap: 4,
    marginTop: 10,
    marginBottom: 2,
  },
  routeItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  routeIconBoxPickup: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  routeIconBoxDelivery: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  routeLineContainer: {
    width: 28,
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
  },
  connectingLine: {
    width: 1.5,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 1,
  },
  routeTextContainer: {
    flex: 1,
    gap: 3,
  },
  routeLabelPickup: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFE399',
    letterSpacing: 0.8,
  },
  routeLabelDelivery: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E297',
    letterSpacing: 0.8,
  },
  routeAddress: {
    color: '#E0E3EF',
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'column',
    gap: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  driverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.25)',
  },
  driverAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 226, 151, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  driverStatusText: {
    fontSize: 11,
    color: '#00E297',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceText: {
    color: '#FFE399',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  paymentTag: {
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.3)',
  },
  paymentTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFE399',
  },
  paidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
  },
  paidChipText: {
    color: '#00E297',
    fontSize: 11,
    fontWeight: '700',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  detailsToggleText: {
    fontSize: 12,
    color: '#C2C6D8',
    fontWeight: '600',
  },
  breakdownDrawer: {
    backgroundColor: '#0E121B',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  breakdownHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 1,
    marginBottom: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12.5,
    color: '#C2C6D8',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 4,
  },
  breakdownTotalLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breakdownTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFE399',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  payButton: {
    flex: 1.3,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#00E297',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    shadowColor: 'rgba(0, 226, 151, 0.35)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  payButtonText: {
    color: '#0F131C',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  trackButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E75FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    shadowColor: 'rgba(0, 102, 255, 0.25)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  deliveredBadgeButton: {
    flex: 1.2,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  deliveredBadgeText: {
    color: '#00E297',
    fontSize: 13,
    fontWeight: '700',
  },
  supportButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  supportButtonText: {
    color: '#DFE2EF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
