/**
 * OrderDetailModal — slides up from bottom when a card is tapped.
 *
 * PENDING   → addresses + earnings → Accept This Order
 * ACCEPTED  → addresses + earnings → Navigate to Pickup → Order Picked Up
 * PICKED_UP → open the full delivery flow for photo capture + customer MMS
 * DELIVERED → confirmation banner
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Spinner } from '@blinkdotnew/mobile-ui';
import { useUpdateOrderStatus } from '@/lib/orders';
import type { Order } from '@/lib/orders';
import { calcDriverEarnings } from '@/lib/config';
import { setSelectedOrder } from '@/lib/selectedOrder';
import * as Haptics from 'expo-haptics';

const BLUE = '#0066FF';
const YELLOW = '#F5C400';
const GREEN = '#22C55E';
const ORANGE = '#F97316';
const BG = '#0A0A0F';
const CARD = '#111827';
const BORDER = 'rgba(255,255,255,0.08)';

function haptic(type: 'light' | 'medium' | 'success' = 'medium') {
  if (Platform.OS === 'web') return;
  if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
  else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
}

function openMaps(address: string) {
  if (!address) return;
  const encoded = encodeURIComponent(address);
  const url = Platform.OS === 'ios'
    ? `maps://maps.apple.com/?daddr=${encoded}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  Linking.openURL(url);
}

// ── Reusable address block ────────────────────────────────────────────────────
function AddressBlock({ title, address, accent }: {
  title: string; address: string; accent: string;
}) {
  return (
    <View style={[styles.addrBlock, { borderLeftColor: accent }]}>
      <Text style={[styles.addrTitle, { color: accent }]}>{title}</Text>
      <Text style={styles.addrValue}>{address || '(no address on file)'}</Text>
      {!!address && (
        <Pressable
          style={[styles.mapsChip, { borderColor: accent + '66', backgroundColor: accent + '18' }]}
          onPress={() => openMaps(address)}
        >
          <Text style={[styles.mapsChipText, { color: accent }]}>Open in Maps →</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Big CTA button ────────────────────────────────────────────────────────────
function BigButton({ label, bg, fg = '#000', icon, loading, onPress }: {
  label: string; bg: string; fg?: string; icon?: string; loading?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.bigBtn, { backgroundColor: bg }, loading && styles.bigBtnDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading
        ? <Spinner size="small" color={fg} />
        : !!icon && <Text style={{ fontSize: 18, color: fg }}>{icon}</Text>}
      <Text style={[styles.bigBtnText, { color: fg }]}>{loading ? 'Please wait…' : label}</Text>
    </Pressable>
  );
}

// ── Outlined nav button ───────────────────────────────────────────────────────
function NavButton({ label, accent, onPress }: { label: string; accent: string; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.navBtn, { borderColor: accent + '55', backgroundColor: accent + '14' }]}
      onPress={onPress}
    >
      <Text style={{ fontSize: 16 }}>🗺️</Text>
      <Text style={[styles.navBtnText, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBadge({ step, label, active, done }: { step: number; label: string; active: boolean; done: boolean }) {
  const bg = done ? GREEN : active ? YELLOW : 'rgba(255,255,255,0.08)';
  const col = done || active ? '#000' : 'rgba(255,255,255,0.3)';
  const tcol = done ? GREEN : active ? YELLOW : 'rgba(255,255,255,0.3)';
  return (
    <View style={styles.stepBadge}>
      <View style={[styles.stepCircle, { backgroundColor: bg }]}>
        <Text style={[styles.stepNum, { color: col }]}>{done ? '✓' : step}</Text>
      </View>
      <Text style={[styles.stepLabel, { color: tcol }]}>{label}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  order: Order | null;
  onClose: () => void;
  onStatusChange?: (id: string, status: string) => void;
}

export default function OrderDetailModal({ order, onClose, onStatusChange }: Props) {
  const updateStatus = useUpdateOrderStatus();
  const [status, setStatus] = useState<string>('pending');
  const [accepting, setAccepting] = useState(false);
  const [pickingUp, setPickingUp] = useState(false);
  const [delivering, setDelivering] = useState(false);

  useEffect(() => {
    if (order) { setStatus(order.status); setAccepting(false); setPickingUp(false); setDelivering(false); }
  }, [order?.id]);

  if (!order) return null;

  const shortId = order.id?.slice(-6).toUpperCase() ?? '';
  const miles = Number(order.distanceMiles ?? 0);
  const earnings = calcDriverEarnings(miles, Number(order.tipAmount ?? 0));

  const statusColor =
    status === 'delivered' ? GREEN :
      status === 'picked_up' ? ORANGE :
        status === 'accepted' ? '#60A5FA' : YELLOW;

  const statusLabel =
    status === 'delivered' ? 'DELIVERED' :
      status === 'picked_up' ? 'PICKED UP' :
        status === 'accepted' ? 'ACCEPTED' : 'PENDING';

  // Step progress: 1=accept, 2=pick up, 3=deliver
  const step1done = status !== 'pending';
  const step2done = status === 'picked_up' || status === 'delivered';
  const step3done = status === 'delivered';
  const step1active = status === 'pending';
  const step2active = status === 'accepted';
  const step3active = status === 'picked_up';

  async function doAccept() {
    haptic('medium'); setAccepting(true);
    try {
      await updateStatus.mutateAsync({ id: order!.id, status: 'accepted' });
      setStatus('accepted'); onStatusChange?.(order!.id, 'accepted');
    } catch { } finally { setAccepting(false); }
  }

  async function doPickUp() {
    haptic('medium'); setPickingUp(true);
    try {
      await updateStatus.mutateAsync({ id: order!.id, status: 'picked_up' });
      setStatus('picked_up'); onStatusChange?.(order!.id, 'picked_up');
    } catch { } finally { setPickingUp(false); }
  }

  function doDeliver() {
    if (!order) return;
    // This legacy sheet has no camera/upload UI. Route the driver through the
    // canonical detail screen so the delivery photo and customer MMS are never skipped.
    setSelectedOrder(order);
    onClose();
    router.push(`/order/${order.id}`);
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{order.customerName}</Text>
            <Text style={styles.headerId}>Order #{shortId}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: statusColor + '66', backgroundColor: statusColor + '1A' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.stepRow}>
            <StepBadge step={1} label="Accept" active={step1active} done={step1done} />
            <View style={[styles.stepLine, { backgroundColor: step1done ? GREEN : BORDER }]} />
            <StepBadge step={2} label="Pick Up" active={step2active} done={step2done} />
            <View style={[styles.stepLine, { backgroundColor: step2done ? GREEN : BORDER }]} />
            <StepBadge step={3} label="Deliver" active={step3active} done={step3done} />
          </View>

          <View style={styles.earningsBanner}>
            <View style={styles.earningsLeft}>
              <Text style={styles.earningsLabel}>YOUR EARNINGS</Text>
              <Text style={styles.earningsTotal}>{earnings.totalDisplay}</Text>
            </View>
            <View style={styles.earningsRight}>
              {earnings.mileageCents > 0 && (
                <Text style={styles.earningsLine}>Mileage ({miles.toFixed(1)} mi):  ${(earnings.mileageCents / 100).toFixed(2)}</Text>
              )}
              {earnings.tipCents > 0 && (
                <Text style={[styles.earningsLine, { color: GREEN }]}>Tip:  ${(earnings.tipCents / 100).toFixed(2)}</Text>
              )}
              {earnings.mileageCents === 0 && earnings.tipCents === 0 && (
                <Text style={styles.earningsLine}>No mileage or tip on this order</Text>
              )}
            </View>
          </View>

          <Text style={styles.sectionHead}>PICK UP FROM</Text>
          <AddressBlock title="Pickup Location" address={order.pickupAddress} accent={YELLOW} />

          <Text style={styles.sectionHead}>DELIVER TO</Text>
          <AddressBlock title="Delivery Address" address={order.deliveryAddress} accent="#60A5FA" />

          {(!!order.customerPhone || !!order.customerEmail) && (
            <View style={styles.customerCard}>
              {!!order.customerPhone && (
                <Pressable style={styles.customerRow} onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}>
                  <Text style={styles.customerIcon}>📞</Text>
                  <Text style={styles.customerPhone}>{order.customerPhone}</Text>
                  <Text style={styles.customerCta}>tap to call</Text>
                </Pressable>
              )}
              {!!order.customerEmail && (
                <View style={[styles.customerRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.customerIcon}>✉️</Text>
                  <Text style={styles.customerPhone}>{order.customerEmail}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {status === 'pending' && (
            <>
              <Text style={styles.instruction}>
                Review the pickup and delivery addresses, then accept to start this delivery.
              </Text>
              <BigButton label="Accept This Order" bg={YELLOW} icon="✓" loading={accepting} onPress={doAccept} />
            </>
          )}

          {status === 'accepted' && (
            <>
              <Text style={styles.instruction}>Head to the pickup location and collect the order.</Text>
              <NavButton
                label="Navigate to Pickup"
                accent={YELLOW}
                onPress={() => { haptic('light'); openMaps(order.pickupAddress || order.deliveryAddress); }}
              />
              <View style={{ height: 12 }} />
              <BigButton label="Order Picked Up" bg={ORANGE} icon="🛍️" loading={pickingUp} onPress={doPickUp} />
            </>
          )}

          {status === 'picked_up' && (
            <>
              <Text style={styles.instruction}>Order in hand — head to the customer and complete the delivery.</Text>
              <NavButton
                label="Navigate to Delivery"
                accent="#60A5FA"
                onPress={() => { haptic('light'); openMaps(order.deliveryAddress); }}
              />
              <View style={{ height: 12 }} />
              <BigButton label="Complete with Photo" bg={GREEN} icon="📸" loading={delivering} onPress={doDeliver} />
            </>
          )}

          {status === 'delivered' && (
            <View style={styles.deliveredBanner}>
              <Text style={{ fontSize: 32 }}>✓</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.deliveredTitle}>Order Delivered!</Text>
                <Text style={styles.deliveredSub}>
                  You earned {earnings.totalDisplay} for this delivery.
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    height: '92%', backgroundColor: BG,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700' },
  headerName: { color: 'white', fontSize: 17, fontWeight: '800' },
  headerId: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Step progress
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 },
  stepBadge: { alignItems: 'center', gap: 4 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 12, fontWeight: '800' },
  stepLabel: { fontSize: 10, fontWeight: '600' },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4, marginBottom: 14 },

  // Earnings
  earningsBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,196,0,0.1)',
    borderWidth: 1, borderColor: 'rgba(245,196,0,0.3)',
    borderRadius: 14, padding: 16, gap: 16, marginBottom: 4,
  },
  earningsLeft: { alignItems: 'center', minWidth: 78 },
  earningsLabel: { color: 'rgba(245,196,0,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  earningsTotal: { color: '#F5C400', fontSize: 28, fontWeight: '900' },
  earningsRight: { flex: 1 },
  earningsLine: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 19 },

  // Address
  sectionHead: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.4, marginTop: 20, marginBottom: 8,
  },
  addrBlock: { backgroundColor: CARD, borderRadius: 12, padding: 14, borderLeftWidth: 3 },
  addrTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  addrValue: { color: 'white', fontSize: 15, fontWeight: '600', lineHeight: 22 },
  mapsChip: {
    alignSelf: 'flex-start', marginTop: 10,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  mapsChipText: { fontSize: 13, fontWeight: '700' },

  // Customer
  customerCard: {
    backgroundColor: CARD, borderRadius: 12, marginTop: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: BORDER,
  },
  customerRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10,
  },
  customerIcon: { fontSize: 15 },
  customerPhone: { color: '#60A5FA', fontSize: 14, fontWeight: '500', flex: 1 },
  customerCta: { color: 'rgba(255,255,255,0.25)', fontSize: 11 },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 20 },
  instruction: { color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 19, marginBottom: 14 },

  // Nav button
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: 12, borderWidth: 1,
  },
  navBtnText: { fontSize: 15, fontWeight: '700' },

  // Big action button
  bigBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 17, borderRadius: 14,
  },
  bigBtnDisabled: { opacity: 0.6 },
  bigBtnText: { fontSize: 17, fontWeight: '800' },

  // Delivered
  deliveredBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 14, padding: 18, marginTop: 8,
  },
  deliveredTitle: { color: GREEN, fontSize: 17, fontWeight: '800' },
  deliveredSub: { color: 'rgba(34,197,94,0.65)', fontSize: 13, marginTop: 3 },
});
