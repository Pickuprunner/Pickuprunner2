import React from 'react';
import { View, Pressable, Linking, Platform, StyleSheet, Text, Alert } from 'react-native';
import { Button, MapPin, Navigation, CheckCircle, Package, Truck, PackageCheck } from '@blinkdotnew/mobile-ui';
import { Order, useUpdateOrderStatus } from '@/lib/orders';
import { calcDriverEarnings } from '@/lib/config';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

const BLUE = '#0066FF';
const YELLOW = '#F5C400';
const GREEN = '#22C55E';
const ORANGE = '#F97316';

function haptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

function openNav(address: string) {
  if (!address) return;
  const encoded = encodeURIComponent(address);
  const url = Platform.OS === 'ios'
    ? `maps://?daddr=${encoded}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  Linking.openURL(url);
}

interface Props {
  order: Order;
  onPress?: () => void;
  /** True when this order belongs to the current driver */
  isMyOrder?: boolean;
  /** True when driver is at 3-order capacity and this is NOT their order */
  driverAtCapacity?: boolean;
  /** Current driver's user ID — needed to stamp on accept */
  driverUserId?: string;
  /** Current driver's display name — stamped on accept */
  driverDisplayName?: string;
}

export function DriverOrderCard({ order, onPress, isMyOrder = false, driverAtCapacity = false, driverUserId, driverDisplayName }: Props) {
  const updateStatus = useUpdateOrderStatus();
  const { status } = order;
  const shortId = order.id ? order.id.slice(-6).toUpperCase() : '------';

  const miles = Number(order.distanceMiles ?? 0);
  const earnings = calcDriverEarnings(miles, Number(order.tipAmount ?? 0));
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);

  const badge =
    status === 'pending'   ? { label: 'UNASSIGNED',  style: styles.badgePending,   text: styles.badgeTextPending }
    : status === 'accepted'  ? { label: 'ACCEPTED',    style: styles.badgeAccepted,  text: styles.badgeTextAccepted }
    : status === 'picked_up' ? { label: 'PICKED UP',   style: styles.badgePickedUp,  text: styles.badgeTextPickedUp }
    :                          { label: 'DELIVERED',   style: styles.badgeDone,      text: styles.badgeTextDone };

  const navAddress =
    status === 'accepted'  ? order.pickupAddress :   // go pick up
    status === 'picked_up' ? order.deliveryAddress : // go deliver
    order.deliveryAddress;

  return (
    <View style={[
      styles.card,
      status === 'accepted'  && styles.cardAccepted,
      status === 'picked_up' && styles.cardPickedUp,
      isMyOrder && styles.cardMine,
      driverAtCapacity && styles.cardDimmed,
    ]}>

      {/* ─── Tappable info area ─── */}
      <Pressable onPress={onPress} style={styles.tapArea}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.customerName} numberOfLines={1}>{order.customerName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isMyOrder && (
              <View style={styles.mineBadge}>
                <Text style={styles.mineBadgeText}>YOURS</Text>
              </View>
            )}
            <View style={[styles.badge, badge.style]}>
              <Text style={[styles.badgeText, badge.text]}>{badge.label}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.orderId}>#{shortId}</Text>

        {/* Pickup */}
        <View style={styles.addrRow}>
          <Package size={14} color={YELLOW} />
          <View style={styles.addrText}>
            <Text style={[styles.addrLabel, { color: YELLOW }]}>PICK UP FROM</Text>
            <Text style={styles.addrValue} numberOfLines={2}>
              {order.pickupAddress || '—'}
            </Text>
          </View>
        </View>

        {/* Delivery */}
        <View style={styles.addrRow}>
          <MapPin size={14} color={BLUE} />
          <View style={styles.addrText}>
            <Text style={[styles.addrLabel, { color: BLUE }]}>DELIVER TO</Text>
            <Text style={styles.addrValue} numberOfLines={2}>
              {order.deliveryAddress || '—'}
            </Text>
          </View>
        </View>

        {/* Earnings pill — always visible */}
        <View style={styles.earningsRow}>
          <View style={styles.earningsPill}>
            <Text style={styles.earningsAmount}>{earnings.totalDisplay}</Text>
            <Text style={styles.earningsBreak}>
              {earnings.mileageCents > 0 ? `${miles.toFixed(1)} mi` : ''}
              {earnings.mileageCents > 0 && earnings.tipCents > 0 ? ' · ' : ''}
              {earnings.tipCents > 0 ? `${(earnings.tipCents / 100).toFixed(2)} tip` : ''}
            </Text>
          </View>
          {!!order.customerPhone && (
            <Text style={styles.phone}>{order.customerPhone}</Text>
          )}
        </View>

      </Pressable>

      {/* ─── Action buttons ─── */}
      <View style={styles.actions}>

        {/* Navigate button */}
        <Button
          size="$3"
          onPress={() => { haptic(); openNav(navAddress); }}
          backgroundColor="rgba(0,102,255,0.12)"
          borderColor="rgba(0,102,255,0.4)"
          borderWidth={1}
          color={BLUE}
          icon={<Navigation size={13} color={BLUE} />}
          paddingHorizontal="$3"
        >
          {status === 'picked_up' ? 'Deliver' : 'Map'}
        </Button>

        {/* PENDING → accept (disabled when driver is at 3-order capacity) */}
        {status === 'pending' && (
          <Button
            flex={1} size="$3"
            onPress={async () => {
              if (driverAtCapacity) return;
              haptic();
              setCheckoutError(null);

              const uid = driverUserId || `guest-${Date.now()}`;
              const uname = driverDisplayName || 'Driver';

              try {
                if (!order.id) {
                  throw new Error('This order is missing its ID. Refresh the Orders tab and try again.');
                }
                console.log('[Accept] Accepting order', order.id);
                await updateStatus.mutateAsync({
                  id: order.id,
                  status: 'accepted',
                  driverUserId: uid,
                  driverName: uname,
                });
                console.log('[Accept] Order accepted');
              } catch (err: any) {
                console.error('[Accept] Failed to accept order:', err);
                setCheckoutError(err?.message || 'Could not accept order');
              }
            }}
            disabled={updateStatus.isPending || driverAtCapacity}
            backgroundColor={driverAtCapacity ? 'rgba(100,100,100,0.2)' : YELLOW}
            color={driverAtCapacity ? '#888' : '#000'}
            fontWeight="800"
            borderColor={driverAtCapacity ? 'rgba(100,100,100,0.3)' : undefined}
            borderWidth={driverAtCapacity ? 1 : 0}
            icon={<Truck size={14} color={driverAtCapacity ? '#888' : '#000'} />}
          >
            {updateStatus.isPending ? '…' : driverAtCapacity ? 'Queue Full' : 'Accept'}
          </Button>
        )}

        {/* ACCEPTED → order picked up */}
        {status === 'accepted' && (
          <Button
            flex={1} size="$3"
            onPress={() => { haptic(); updateStatus.mutate({ id: order.id, status: 'picked_up' }); }}
            disabled={updateStatus.isPending}
            backgroundColor={ORANGE} color="#000" fontWeight="800"
            icon={<PackageCheck size={14} color="#000" />}
          >
            {updateStatus.isPending ? '…' : 'Order Picked Up'}
          </Button>
        )}

        {/* PICKED_UP → open delivery flow so a photo is captured and texted */}
        {status === 'picked_up' && (
          <Button
            flex={1} size="$3"
            onPress={() => {
              haptic();
              router.push(`/order/${order.id}`);
            }}
            disabled={updateStatus.isPending}
            backgroundColor={GREEN} color="#000" fontWeight="800"
            icon={<CheckCircle size={14} color="#000" />}
          >
            Complete with Photo
          </Button>
        )}

        {/* DELIVERED */}
        {status === 'delivered' && (
          <Button
            flex={1} size="$3" disabled
            backgroundColor="rgba(34,197,94,0.1)"
            borderColor="rgba(34,197,94,0.3)" borderWidth={1}
            color={GREEN} icon={<CheckCircle size={14} color={GREEN} />}
          >
            Delivered ✓
          </Button>
        )}

      </View>

      {/* ─── Error message (only shown if accept/pickup/deliver fails) ─── */}
      {checkoutError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {checkoutError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardAccepted:  { borderColor: 'rgba(0,102,255,0.45)',  backgroundColor: '#0A1628' },
  cardPickedUp:  { borderColor: 'rgba(249,115,22,0.5)',  backgroundColor: '#1A0E00' },
  cardMine:      { borderColor: 'rgba(34,197,94,0.5)',   borderWidth: 1.5 },
  cardDimmed:    { opacity: 0.45 },
  mineBadge:     { backgroundColor: 'rgba(34,197,94,0.18)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.5)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  mineBadgeText: { color: '#22C55E', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },

  tapArea: { padding: 16, paddingBottom: 8 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  customerName: { color: 'white', fontSize: 17, fontWeight: '800', flex: 1, marginRight: 8 },
  orderId: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace', marginBottom: 12 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  badgePending:       { backgroundColor: 'rgba(245,196,0,0.1)',   borderColor: 'rgba(245,196,0,0.35)' },
  badgeTextPending:   { color: '#F5C400' },
  badgeAccepted:      { backgroundColor: 'rgba(0,102,255,0.15)',  borderColor: 'rgba(0,102,255,0.5)' },
  badgeTextAccepted:  { color: '#60A5FA' },
  badgePickedUp:      { backgroundColor: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.5)' },
  badgeTextPickedUp:  { color: '#FB923C' },
  badgeDone:          { backgroundColor: 'rgba(34,197,94,0.1)',   borderColor: 'rgba(34,197,94,0.35)' },
  badgeTextDone:      { color: '#22C55E' },

  addrRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  addrText:  { flex: 1 },
  addrLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  addrValue: { color: 'white', fontSize: 13, lineHeight: 18 },

  earningsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 },
  earningsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,196,0,0.12)',
    borderWidth: 1, borderColor: 'rgba(245,196,0,0.3)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  earningsAmount: { color: YELLOW, fontSize: 15, fontWeight: '900' },
  earningsBreak:  { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  phone: { color: '#60A5FA', fontSize: 12 },

  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239,68,68,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: { color: '#FCA5A5', fontSize: 11, fontWeight: '600' },
});
