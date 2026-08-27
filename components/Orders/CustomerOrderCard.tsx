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
import { CustomCard } from '@/components/core';
import { APP_CONFIG } from '@/lib/config';
import { createCheckoutForOrder, openCheckoutUrl } from '@/apis/checkout';
import { ordersApi } from '@/apis/orders';
import { useOrderStore } from '@/store/useOrderStore';

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
  driver_name?: string;
  driverName?: string;
  driver_photo_url?: string;
  deliveryPhotoUrl?: string;
  delivery_photo_url?: string;
  customerSessionId?: string;
  customer_session_id?: string;
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
  const [expanded, setExpanded] = useState(false);

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
  const isAccepted = currentStatus === 'accepted' || currentStatus === 'assigned';
  const isPickedUp = currentStatus === 'picked_up' || currentStatus === 'en_route' || currentStatus === 'shopping';
  const isDelivered = currentStatus === 'delivered';
  const driverName = order.driverName || order.driver_name;

  const initial = (customerName?.trim() || 'C').charAt(0).toUpperCase();

  const [paying, setPaying] = useState(false);

  const isPaid =
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
  const needsPayment = isChargeable && !isPaid;

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
        await openCheckoutUrl(res.url);
        try {
          const latest = await ordersApi.getById(order.id);
          if (latest && latest.id) {
            useOrderStore.getState().upsertOrder(latest);
          }
        } catch {}
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
          label: 'DRIVER ON THE WAY',
          color: '#0066FF',
          bg: 'rgba(0, 102, 255, 0.15)',
          border: 'rgba(0, 102, 255, 0.35)',
        };
      case 'shopping':
        return {
          label: 'SHOPPING',
          color: '#FFE399',
          bg: 'rgba(255, 227, 153, 0.15)',
          border: 'rgba(255, 227, 153, 0.35)',
        };
      case 'picked_up':
      case 'en_route':
        return {
          label: 'OUT FOR DELIVERY',
          color: '#F4C300',
          bg: 'rgba(244, 195, 0, 0.15)',
          border: 'rgba(244, 195, 0, 0.35)',
        };
      case 'delivered':
        return {
          label: 'DELIVERED',
          color: '#00E297',
          bg: 'rgba(0, 226, 151, 0.12)',
          border: 'rgba(0, 226, 151, 0.35)',
        };
      case 'cancelled':
        return {
          label: 'CANCELLED',
          color: '#FF6B6B',
          bg: 'rgba(255, 107, 107, 0.15)',
          border: 'rgba(255, 107, 107, 0.35)',
        };
      case 'pending':
      default:
        return {
          label: 'PENDING',
          color: '#F4C300',
          bg: 'rgba(244, 195, 0, 0.1)',
          border: 'rgba(244, 195, 0, 0.3)',
        };
    }
  };

  const badge = getStatusBadge();

  const headerNode = (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userTextCol}>
          <Text style={styles.userName} numberOfLines={1}>
            {customerName}
          </Text>
          <Text style={styles.orderId}>#{shortId} · {formatRelativeTime(createdAt)}</Text>
        </View>
      </View>

      <View style={styles.badgesWrapper}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: badge.bg, borderColor: badge.border },
          ]}
        >
          <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>
    </View>
  );

  const footerNode = (
    <View style={styles.footer}>
      {driverName && !isDelivered && (
        <View style={styles.driverBanner}>
          <View style={styles.driverAvatar}>
            <MaterialIcons name="person" size={16} color="#00E297" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverNameText}>{driverName}</Text>
            <Text style={styles.driverStatusText}>
              {isPickedUp ? 'Package picked up · Heading to you' : 'Driver assigned · Heading to store'}
            </Text>
          </View>
        </View>
      )}

      <Pressable
        onPress={() => {
          haptic();
          setExpanded((v) => !v);
        }}
        style={styles.priceRow}
      >
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>{fmt(totalCents)}</Text>
          <View style={[styles.paymentTag, isPaid && { backgroundColor: 'rgba(0, 226, 151, 0.15)', borderColor: 'rgba(0, 226, 151, 0.4)' }]}>
            <Text style={[styles.paymentTagText, isPaid && { color: '#00E297' }]}>
              {isPaid ? '✓ Paid' : '$ Pay on Pickup'}
            </Text>
          </View>
        </View>

        <View style={styles.detailsToggle}>
          <Text style={styles.detailsToggleText}>
            {expanded ? 'Hide Details' : 'View Details'}
          </Text>
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={18}
            color="#8C90A1"
          />
        </View>
      </Pressable>

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
                <MaterialIcons name="payment" size={15} color="#0F131C" />
                <Text style={styles.payButtonText} numberOfLines={1}>
                  Pay {fmt(totalCents)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isPaid && (
          <View style={[styles.payButton, { backgroundColor: 'rgba(0, 226, 151, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 226, 151, 0.4)' }]}>
            <MaterialIcons name="check-circle" size={15} color="#00E297" />
            <Text style={[styles.payButtonText, { color: '#00E297' }]} numberOfLines={1}>
              PAID
            </Text>
          </View>
        )}

        {!isDelivered ? (
          <TouchableOpacity
            onPress={() => {
              haptic();
              router.push({
                pathname: `/(customer)/track/${order.id}`,
                params: {
                  deliveryAddress: order.deliveryAddress || order.delivery_address || '123 E Test Ave, Sahuarita, AZ 85629',
                  pickupAddress: order.pickupAddress || order.pickup_address || APP_CONFIG.STORE_ADDRESS,
                  customerName: customerName,
                  customerPhone: customerPhone,
                  items: order.items || '',
                  status: currentStatus,
                },
              } as any);
            }}
            activeOpacity={0.85}
            style={styles.actionButton}
          >
            <MaterialIcons name="near-me" size={15} color="#f8f7ff" />
            <Text style={styles.actionButtonText} numberOfLines={1}>
              Track
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => {
              haptic();
              router.push({
                pathname: `/(customer)/track/${order.id}`,
                params: {
                  deliveryAddress: order.deliveryAddress || order.delivery_address || '123 E Test Ave, Sahuarita, AZ 85629',
                  pickupAddress: order.pickupAddress || order.pickup_address || APP_CONFIG.STORE_ADDRESS,
                  customerName: customerName,
                  customerPhone: customerPhone,
                  items: order.items || '',
                  status: currentStatus,
                },
              } as any);
            }}
            activeOpacity={0.85}
            style={styles.deliveredBadgeButton}
          >
            <MaterialIcons name="check-circle" size={15} color="#00e297" />
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
      onPress={onPress}
      style={[styles.cardContainer, style]}
    >
      <View style={styles.routesContainer}>
        <View style={styles.connectingLine} />

        <View style={styles.routeItem}>
          <View style={[styles.routeIcon, { borderColor: '#b3c5ff' }]}>
            <MaterialIcons name="inventory-2" size={12} color="#b3c5ff" />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={[styles.routeLabel, { color: '#b3c5ff' }]}>Pick up from</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>
              {pickupAddress}
            </Text>
          </View>
        </View>

        <View style={styles.routeItem}>
          <View style={[styles.routeIcon, { borderColor: '#00e297' }]}>
            <MaterialIcons name="location-on" size={12} color="#00e297" />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={[styles.routeLabel, { color: '#00e297' }]}>Deliver to</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>
              {deliveryAddress}
            </Text>
          </View>
        </View>
      </View>

      {order.items ? (
        <View style={styles.itemsPill}>
          <Ionicons name="information-circle-outline" size={16} color="#B3C5FF" />
          <View style={styles.itemsTextCol}>
            {(() => {
              const bracketMatch = order.items.match(/^(\[[^\]]+\])\s*(.*)$/);
              if (bracketMatch) {
                return (
                  <Text style={styles.itemsPillText} numberOfLines={2} ellipsizeMode="tail">
                    <Text style={styles.itemsHighlightTag}>{bracketMatch[1]}</Text>
                    {bracketMatch[2] ? ` ${bracketMatch[2]}` : ''}
                  </Text>
                );
              }
              return (
                <Text style={styles.itemsPillText} numberOfLines={2} ellipsizeMode="tail">
                  {order.items}
                </Text>
              );
            })()}
          </View>
        </View>
      ) : null}
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userTextCol: {
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F131C',
    borderWidth: 1.5,
    borderColor: '#FFE399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFE399',
    fontSize: 14,
    fontWeight: '700',
  },
  userName: {
    color: '#dfe2ef',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  orderId: {
    color: 'rgba(194, 198, 216, 0.7)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  badgesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  routesContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  connectingLine: {
    position: 'absolute',
    left: 10,
    top: 24,
    bottom: 24,
    width: 1,
    backgroundColor: 'rgba(66, 70, 86, 0.3)',
  },
  routeItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    zIndex: 1,
  },
  routeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0f131c',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  routeTextContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  routeAddress: {
    color: '#dfe2ef',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  itemsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 102, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.22)',
    marginTop: 12,
    overflow: 'hidden',
  },
  itemsTextCol: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  itemsPillText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#DFE2EF',
    fontWeight: '500',
    flexShrink: 1,
  },
  itemsHighlightTag: {
    color: '#B3C5FF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'column',
    gap: 14,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
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
    gap: 8,
  },
  priceText: {
    color: '#ffe399',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  paymentTag: {
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.25)',
  },
  paymentTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffe399',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsToggleText: {
    fontSize: 12,
    color: '#8C90A1',
    fontWeight: '600',
  },
  breakdownDrawer: {
    backgroundColor: '#10131B',
    borderRadius: 12,
    padding: 12,
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
    marginVertical: 2,
  },
  breakdownTotalLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breakdownTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffe399',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  payButton: {
    flex: 1.2,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#00E297',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    shadowColor: 'rgba(0, 226, 151, 0.35)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  payButtonText: {
    color: '#0F131C',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  actionButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0066ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    shadowColor: 'rgba(0, 102, 255, 0.25)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    color: '#f8f7ff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  supportButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  supportButtonText: {
    color: '#dfe2ef',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cancelButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  deliveredBadgeButton: {
    flex: 1.25,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8,
  },
  deliveredBadgeText: {
    color: '#00e297',
    fontSize: 12,
    fontWeight: '700',
  },
});
