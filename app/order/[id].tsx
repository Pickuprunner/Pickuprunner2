/**
 * Full-screen delivery flow: Accept → Pickup → Deliver (with photo)
 *
 * STEP 1 (pending)   — order details + Accept button
 * STEP 2 (accepted)  — navigate to pickup + "Order Picked Up" button
 * STEP 3 (picked_up) — navigate to delivery + take/upload delivery photo + "Mark Delivered" button
 * DONE  (delivered)  — success screen with photo thumbnail
 */
import React, { useState, useEffect } from 'react';
import {
  ScrollView, Linking, Platform, StyleSheet,
  View, Text, Pressable, Image, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  YStack, XStack, SizableText, Button, SafeArea, Spinner,
  ChevronLeft, Navigation, CheckCircle, Truck, AlertCircle,
  PackageCheck, Camera, ArrowUpCircle,
} from '@blinkdotnew/mobile-ui';
import * as ImagePicker from 'expo-image-picker';
import { useOrders, useUpdateOrderStatus } from '@/lib/orders';
import type { Order } from '@/lib/orders';
import { getSelectedOrder } from '@/lib/selectedOrder';
import { blink } from '@/lib/blink';
import { calcDriverEarnings, APP_CONFIG } from '@/lib/config';
import { toast } from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { useDriverQueue, MAX_QUEUE } from '@/lib/driverQueue';
import { useDriverId } from '@/hooks/useDriverId';

const BLUE   = '#0066FF';
const YELLOW = '#F5C400';
const GREEN  = '#22C55E';
const ORANGE = '#F97316';
const BG     = '#0A0A0F';
const CARD   = '#111827';
const BORDER = 'rgba(255,255,255,0.07)';
const BACKEND_URL = 'https://vljh4v3j.backend.blink.new';

function haptic(type: 'medium' | 'success' = 'medium') {
  if (Platform.OS === 'web') return;
  if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

function openMaps(address: string) {
  if (!address) return;
  const encoded = encodeURIComponent(address);
  const url = Platform.OS === 'ios'
    ? `maps://maps.apple.com/?daddr=${encoded}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  Linking.openURL(url);
}

// ── Step indicator row ────────────────────────────────────────────────────────
function StepBar({ status }: { status: string }) {
  const step1done   = status !== 'pending';
  const step2done   = status === 'picked_up' || status === 'delivered';
  const step3done   = status === 'delivered';
  const step1active = status === 'pending';
  const step2active = status === 'accepted';
  const step3active = status === 'picked_up';

  const dot = (done: boolean, active: boolean, n: number) => (
    <View style={[styles.stepCircle, done ? styles.stepDone : active ? styles.stepActive : styles.stepFuture]}>
      <Text style={[styles.stepNum, (done || active) ? { color: '#000' } : { color: 'rgba(255,255,255,0.3)' }]}>
        {done ? '✓' : n}
      </Text>
    </View>
  );
  const line = (filled: boolean) => (
    <View style={[styles.stepLine, { backgroundColor: filled ? GREEN : 'rgba(255,255,255,0.1)' }]} />
  );
  const label = (text: string, active: boolean, done: boolean) => (
    <Text style={[styles.stepLabel, done ? { color: GREEN } : active ? { color: YELLOW } : { color: 'rgba(255,255,255,0.3)' }]}>
      {text}
    </Text>
  );

  return (
    <View style={styles.stepBar}>
      <View style={styles.stepItem}>
        {dot(step1done, step1active, 1)}
        {label('Accept', step1active, step1done)}
      </View>
      {line(step1done)}
      <View style={styles.stepItem}>
        {dot(step2done, step2active, 2)}
        {label('Pick Up', step2active, step2done)}
      </View>
      {line(step2done)}
      <View style={styles.stepItem}>
        {dot(step3done, step3active, 3)}
        {label('Deliver', step3active, step3done)}
      </View>
    </View>
  );
}

// ── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, accent, onPress }: {
  label: string; value?: string | null; accent?: string; onPress?: () => void;
}) {
  if (!value) return null;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoRight}>
        <Text style={[styles.infoValue, accent ? { color: accent } : undefined]} numberOfLines={3}>
          {value}
        </Text>
        {onPress && <Text style={styles.infoTap}>→</Text>}
      </View>
    </Pressable>
  );
}

// ── Address card ─────────────────────────────────────────────────────────────
function AddressCard({ emoji, label, address, accent, onNavigate }: {
  emoji: string; label: string; address: string; accent: string; onNavigate: () => void;
}) {
  return (
    <View style={[styles.addrCard, { borderLeftColor: accent }]}>
      <View style={styles.addrTop}>
        <Text style={styles.addrEmoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.addrLabel, { color: accent }]}>{label}</Text>
          <Text style={styles.addrValue}>{address || '(not set)'}</Text>
        </View>
      </View>
      {!!address && (
        <Pressable style={[styles.mapBtn, { borderColor: accent + '55', backgroundColor: accent + '14' }]} onPress={onNavigate}>
          <Text style={{ fontSize: 14 }}>🗺️</Text>
          <Text style={[styles.mapBtnText, { color: accent }]}>Open in Maps</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const updateStatus = useUpdateOrderStatus();
  const { user } = useAuth();
  const driverId = useDriverId();
  const { data: allOrders = [] } = useOrders();
  const { queueCount, atCapacity } = useDriverQueue(allOrders, driverId);

  const [order, setOrder]       = useState<Order | null>(getSelectedOrder);
  const [loading, setLoading]   = useState(!getSelectedOrder());
  const [status, setStatus]     = useState<string>(getSelectedOrder()?.status ?? 'pending');

  // Action states
  const [accepting,  setAccepting]  = useState(false);
  const [pickingUp,  setPickingUp]  = useState(false);
  const [delivering, setDelivering] = useState(false);

  // Delivery photo
  const [photoUri,     setPhotoUri]     = useState<string | null>(null);
  const [photoUrl,     setPhotoUrl]     = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Load order from DB if not in memory
  useEffect(() => {
    const stored = getSelectedOrder();
    if (stored && stored.id === id) {
      setOrder(stored);
      setStatus(stored.status);
      setLoading(false);
      return;
    }
    const fetchId = Array.isArray(id) ? id[0] : id;
    if (!fetchId) return;
    setLoading(true);
    (async () => {
      try {
        // Try SDK first
        let result: any = null;
        try {
          result = await blink.db.orders.get(fetchId);
        } catch {}
        if (!result) {
          try {
            const rows = await blink.db.orders.list({ where: { id: fetchId } });
            result = rows[0] ?? null;
          } catch {}
        }
        // REST fallback
        if (!result) {
          try {
            const { blinkDbGet } = await import('@/lib/blinkApi');
            result = await blinkDbGet('orders', fetchId);
          } catch {}
        }
        if (result) { setOrder(result as Order); setStatus(result.status); }
      } finally { setLoading(false); }
    })();
  }, []);

  if (!order && !loading) {
    return (
      <SafeArea>
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$4">
          <AlertCircle size={48} color="#EF4444" />
          <SizableText size="$5" fontWeight="700" color="white" textAlign="center">Order not found</SizableText>
          <Button variant="outlined" onPress={() => router.back()}>← Go Back</Button>
        </YStack>
      </SafeArea>
    );
  }

  const miles    = Number(order?.distanceMiles ?? 0);
  const earnings = order ? calcDriverEarnings(miles, Number(order.tipAmount ?? 0)) : null;
  const shortId  = order?.id?.slice(-6).toUpperCase() ?? '------';
  const isMeetCustomer = !!(order?.items?.includes('[MEET CUSTOMER]'));

  const statusColor =
    status === 'delivered' ? GREEN :
    status === 'picked_up' ? ORANGE :
    status === 'accepted'  ? '#60A5FA' : YELLOW;
  const statusLabel =
    status === 'delivered' ? 'DELIVERED' :
    status === 'picked_up' ? 'PICKED UP' :
    status === 'accepted'  ? 'ACCEPTED'  : 'PENDING';

  // ── Photo helpers ────────────────────────────────────────────────────────
  async function pickPhoto(source: 'camera' | 'library') {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera' && Platform.OS !== 'web') {
        const { status: perm } = await ImagePicker.requestCameraPermissionsAsync();
        if (perm !== 'granted') {
          Alert.alert('Camera permission needed', 'Please allow camera access in Settings to take a delivery photo.');
          return;
        }
        // CRITICAL: pass ONLY quality — mediaTypes/allowsEditing cause Android
        // intent resolver to pick gallery over camera
        console.log('[pickPhoto] Launching camera (bare options)…');
        result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      } else {
        console.log('[pickPhoto] Launching library…');
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], quality: 0.7,
        });
      }
      console.log('[pickPhoto] canceled:', result.canceled, 'assets:', result.assets?.length);
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPhotoUri(asset.uri);
      await uploadPhoto(asset.uri);
    } catch (err: any) {
      console.error('[pickPhoto] Error:', err?.message || err);
      Alert.alert('Camera Error', `${err?.message || 'Could not open camera.'}\n\nUse "Choose File" instead.`);
    }
  }

  async function uploadPhoto(uri: string) {
    setUploadingPhoto(true);
    try {
      const ext = uri.split('.').pop()?.split('?')[0]?.replace('jpg', 'jpeg') ?? 'jpeg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const filename = `delivery_${order!.id}_${Date.now()}.${ext}`;
      const storagePath = `delivery-photos/${filename}`;

      let publicUrl: string;

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const resp = await fetch(uri);
        const blob = await resp.blob();
        formData.append('file', new File([blob], filename, { type: mimeType }));
      } else {
        formData.append('file', { uri, type: mimeType, name: filename } as any);
      }
      formData.append('path', storagePath);

      const resp = await fetch(`${BACKEND_URL}/delivery-photo`, {
        method: 'POST',
        body: formData as any,
      });
      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`Upload failed (HTTP ${resp.status}): ${text.substring(0, 200)}`);
      }
      const data = JSON.parse(text || '{}');
      publicUrl = data?.data?.publicUrl || data?.publicUrl || data?.url || data?.data?.url;
      if (!publicUrl) throw new Error('Upload OK but no publicUrl in response');
      console.log('[uploadPhoto] Upload success:', publicUrl);

      setPhotoUrl(publicUrl);
      toast('Photo uploaded', { variant: 'success' });
    } catch (e: any) {
      console.error('[uploadPhoto] Final error:', e?.message || e);
      toast('Upload failed', {
        message: `${e?.message || 'unknown error'}. Please tap "Choose File" to retry.`,
        variant: 'error',
      });
    } finally {
      setUploadingPhoto(false);
    }
  }

  // ── Status mutations ─────────────────────────────────────────────────────
  async function doAccept() {
    if (!order) return;
    if (atCapacity) {
      Alert.alert(
        `Queue Full (${MAX_QUEUE}/${MAX_QUEUE})`,
        `You already have ${MAX_QUEUE} active orders. Complete or deliver one before accepting another.`,
        [{ text: 'OK' }]
      );
      return;
    }
    haptic('medium'); setAccepting(true);
    try {
      console.log('[doAccept] Accepting order:', order.id, 'driverId:', driverId);
      await updateStatus.mutateAsync({
        id: order.id,
        status: 'accepted',
        driverUserId: driverId,
        driverName: user?.displayName ?? user?.email ?? driverId?.slice(0, 8),
      });
      setStatus('accepted');
      toast('Order Accepted!', { message: 'Head to the pickup address. Accept more from the Orders tab.', variant: 'success' });
    } catch (e: any) {
      console.error('[doAccept] Error:', e?.message || e);
      toast('Error', { message: e?.message || 'Could not accept order', variant: 'error' });
    }
    finally { setAccepting(false); }
  }

  async function doPickUp() {
    if (!order) return;
    haptic('medium'); setPickingUp(true);
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'picked_up' });
      setStatus('picked_up');

      // Send payment link to customer silently in background — driver doesn't see this
      const orderMiles = Number(order.distanceMiles ?? 0);
      const billableMiles = Math.max(0, orderMiles - APP_CONFIG.FREE_MILES);
      const mileageCents = Math.round(billableMiles * APP_CONFIG.MILEAGE_RATE_CENTS);
      const deliveryFee = APP_CONFIG.DELIVERY_FEE_CENTS;
      const tipAmount = Number(order.tipAmount ?? 0);
      const totalCents = deliveryFee + mileageCents + tipAmount;

      fetch(`${BACKEND_URL}/send-payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amountCents: totalCents,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          description: `Pickup Runner delivery — ${order.pickupAddress} → ${order.deliveryAddress}`,
        }),
      }).catch(() => {}); // fire-and-forget

      toast('Order Picked Up', { message: 'Head to the delivery address to complete the delivery.', variant: 'success' });
    } catch { toast('Error', { message: 'Could not update status', variant: 'error' }); }
    finally { setPickingUp(false); }
  }

  async function doDeliver() {
    if (!order) return;
    if (!photoUrl) {
      Alert.alert('Delivery Photo Required', 'Please take or upload a photo and wait for the Uploaded confirmation before completing this delivery. The photo is sent to the customer with the delivery text.');
      return;
    }
    haptic('success'); setDelivering(true);
    try {
      const updated = await updateStatus.mutateAsync({
        id: order.id,
        status: 'delivered',
        deliveryPhotoUrl: photoUrl ?? undefined,
      });
      setStatus('delivered');
      const notification = updated.deliveryNotification;
      const message = notification?.sent
        ? `Customer texted with the delivery photo. You earned ${earnings?.totalDisplay ?? ''}.`
        : `Delivered and earned ${earnings?.totalDisplay ?? ''}. ${notification?.reason ?? 'Customer text was not sent.'}`;
      toast(notification?.sent ? 'Delivered! 🎉' : 'Delivered', { message, variant: notification?.sent ? 'success' : 'warning' });
    } catch (e: any) {
      console.error('[doDeliver] Error:', e?.message || e);
      toast('Error', { message: e?.message || 'Could not mark delivered', variant: 'error' });
    }
    finally { setDelivering(false); }
  }

  const displayStatus = order ? { ...order, status: status as Order['status'] } : order;

  return (
    <SafeArea>

      {/* ── Header ── */}
      <XStack
        paddingHorizontal="$4" paddingTop="$3" paddingBottom="$3"
        alignItems="center" gap="$3"
        borderBottomWidth={1} borderBottomColor={BORDER}
      >
        <Button
          size="$3" variant="outlined" borderRadius={20}
          icon={<ChevronLeft size={20} />}
          onPress={() => router.back()}
          paddingHorizontal="$2"
        />
        <YStack flex={1}>
          <SizableText size="$6" fontWeight="800" color="white" numberOfLines={1}>
            {order?.customerName || 'Order Details'}
          </SizableText>
          <SizableText size="$2" color="rgba(255,255,255,0.35)" fontFamily="$mono">
            #{shortId}
          </SizableText>
        </YStack>
        <View style={[styles.badge, { borderColor: statusColor + '66', backgroundColor: statusColor + '1A' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </XStack>

      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
          <Spinner size="large" color={BLUE} />
          <SizableText color="rgba(255,255,255,0.5)">Loading order…</SizableText>
        </YStack>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Step progress ── */}
          <StepBar status={status} />

          {/* ── Earnings banner ── */}
          {earnings && (earnings.mileageCents > 0 || earnings.tipCents > 0) && (
            <View style={styles.earningsBanner}>
              <View style={styles.earningsLeft}>
                <Text style={styles.earningsLabel}>YOUR EARNINGS</Text>
                <Text style={styles.earningsTotal}>{earnings.totalDisplay}</Text>
              </View>
              <View style={styles.earningsRight}>
                {earnings.mileageCents > 0 && (
                  <Text style={styles.earningsLine}>Mileage ({miles.toFixed(1)} mi): ${(earnings.mileageCents / 100).toFixed(2)}</Text>
                )}
                {earnings.tipCents > 0 && (
                  <Text style={[styles.earningsLine, { color: GREEN }]}>Tip: ${(earnings.tipCents / 100).toFixed(2)}</Text>
                )}
              </View>
            </View>
          )}

          {/* ── Addresses ── */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionHeadText}>PICK UP FROM</Text>
          </View>
          <AddressCard
            emoji="🛒" label="Pickup Runner"
            address={order?.pickupAddress ?? ''}
            accent={YELLOW}
            onNavigate={() => openMaps(order?.pickupAddress ?? '')}
          />

          <View style={styles.sectionHead}>
            <Text style={styles.sectionHeadText}>DELIVER TO</Text>
          </View>
          <AddressCard
            emoji="📍" label="Customer Address"
            address={order?.deliveryAddress ?? ''}
            accent="#60A5FA"
            onNavigate={() => openMaps(order?.deliveryAddress ?? '')}
          />

          {/* ── Customer info ── */}
          <View style={styles.card}>
            <Text style={styles.cardHead}>CUSTOMER</Text>
            <InfoRow label="Name" value={order?.customerName} />
            <InfoRow
              label="Phone" value={order?.customerPhone}
              accent={BLUE}
              onPress={() => order?.customerPhone ? Linking.openURL(`tel:${order.customerPhone}`) : undefined}
            />
            {!!order?.items && order.items !== 'N/A' && (
              <InfoRow label="Items" value={order.items} />
            )}
            <InfoRow
              label="Delivery"
              value={isMeetCustomer ? '🤝 Meet at Door' : '🚪 Leave at Door'}
              accent={isMeetCustomer ? '#60A5FA' : undefined}
            />
          </View>

          <View style={styles.divider} />

          {/* ════════════════════════════════════════════
              STEP 1 — PENDING: accept the order
          ════════════════════════════════════════════ */}
          {status === 'pending' && (
            <View style={styles.actionBox}>
              <Text style={styles.stepInstruction}>
                Review the pickup and delivery addresses above, then accept this order to begin.
              </Text>
              <Button
                size="$5" borderRadius={14} width="100%"
                backgroundColor={YELLOW} color="#000" fontWeight="800"
                icon={accepting ? <Spinner size="small" color="#000" /> : <Truck size={18} color="#000" />}
                onPress={doAccept} disabled={accepting}
              >
                {accepting ? 'Accepting…' : 'Accept This Order'}
              </Button>
            </View>
          )}

          {/* ════════════════════════════════════════════
              STEP 2 — ACCEPTED: go pick it up
          ════════════════════════════════════════════ */}
          {status === 'accepted' && (
            <View style={styles.actionBox}>
              <Text style={styles.stepInstruction}>
                Head to the store and collect the order, then tap below once you have it.
              </Text>
              <Button
                size="$5" borderRadius={14} width="100%" marginBottom="$3"
                variant="outlined"
                icon={<Navigation size={18} />}
                onPress={() => openMaps(order?.pickupAddress ?? '')}
              >
                Navigate to Pickup
              </Button>
              <Button
                size="$5" borderRadius={14} width="100%"
                backgroundColor={ORANGE} color="#000" fontWeight="800"
                icon={pickingUp ? <Spinner size="small" color="#000" /> : <PackageCheck size={18} color="#000" />}
                onPress={doPickUp} disabled={pickingUp}
              >
                {pickingUp ? 'Updating…' : 'Order Picked Up'}
              </Button>
            </View>
          )}

          {/* ════════════════════════════════════════════
              STEP 3 — PICKED_UP: deliver + photo
          ════════════════════════════════════════════ */}
          {status === 'picked_up' && (
            <View style={styles.actionBox}>
              <Text style={styles.stepInstruction}>
                {isMeetCustomer
                  ? 'The customer will meet you at their door. Head to the delivery address and hand off the order directly.'
                  : 'Deliver the order, then take a photo at the delivery location before marking complete.'}
              </Text>

              <Button
                size="$5" borderRadius={14} width="100%" marginBottom="$4"
                variant="outlined"
                icon={<Navigation size={18} />}
                onPress={() => openMaps(order?.deliveryAddress ?? '')}
              >
                Navigate to Delivery
              </Button>

              {/* Photo section — required so the customer can receive the MMS confirmation */}
              <View style={styles.photoSection}>
                <Text style={styles.photoTitle}>
                  📸 Delivery Photo  <Text style={styles.photoRequired}>(Required for customer text)</Text>
                </Text>
                {isMeetCustomer && (
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20, marginBottom: 10 }}>
                    The customer requested to meet you at the door. Take a quick handoff photo so the delivery confirmation can include it.
                  </Text>
                )}

                {/* Preview */}
                {(photoUri || photoUrl) && (
                  <View style={styles.photoPreviewBox}>
                    <Image
                      source={{ uri: photoUri ?? photoUrl ?? '' }}
                      style={styles.photoPreview}
                      resizeMode="cover"
                    />
                    {uploadingPhoto && (
                      <View style={styles.photoUploadingOverlay}>
                        <Spinner size="large" color="white" />
                        <Text style={{ color: 'white', marginTop: 8, fontWeight: '700' }}>Uploading…</Text>
                      </View>
                    )}
                    {!uploadingPhoto && photoUrl && (
                      <View style={styles.photoUploadedBadge}>
                        <Text style={styles.photoUploadedText}>✓ Uploaded</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Camera / Library buttons — always show both */}
                <XStack gap="$3" marginTop="$3">
                  <Button
                    flex={1} size="$4" borderRadius={12}
                    backgroundColor="rgba(249,115,22,0.12)"
                    borderColor="rgba(249,115,22,0.4)" borderWidth={1}
                    color={ORANGE}
                    icon={<Camera size={16} color={ORANGE} />}
                    onPress={() => pickPhoto('camera')}
                    disabled={uploadingPhoto}
                  >
                    Take Photo
                  </Button>
                  <Button
                    flex={1} size="$4" borderRadius={12}
                    backgroundColor="rgba(96,165,250,0.12)"
                    borderColor="rgba(96,165,250,0.4)" borderWidth={1}
                    color="#60A5FA"
                    icon={<ArrowUpCircle size={16} color="#60A5FA" />}
                    onPress={() => pickPhoto('library')}
                    disabled={uploadingPhoto}
                  >
                    Choose File
                  </Button>
                </XStack>
              </View>

              {/* Mark delivered button */}
              <Button
                size="$5" borderRadius={14} width="100%" marginTop="$4"
                backgroundColor={photoUrl ? GREEN : 'rgba(34,197,94,0.25)'}
                color="#000" fontWeight="800"
                icon={delivering
                  ? <Spinner size="small" color="#000" />
                  : <CheckCircle size={18} color="#000" />}
                onPress={doDeliver}
                disabled={delivering || uploadingPhoto}
              >
                {delivering ? 'Updating…' : 'Mark as Delivered'}
              </Button>
              {!photoUrl && (
                <Text style={styles.photoHint}>Wait for the Uploaded confirmation before completing — the customer receives this photo by text</Text>
              )}
            </View>
          )}

          {/* ════════════════════════════════════════════
              DONE — DELIVERED
          ════════════════════════════════════════════ */}
          {status === 'delivered' && (
            <View style={styles.actionBox}>
              <View style={styles.deliveredCard}>
                <Text style={{ fontSize: 36 }}>🎉</Text>
                <YStack flex={1} gap="$1">
                  <SizableText fontWeight="800" color={GREEN} size="$5">Order Delivered!</SizableText>
                  {earnings && (earnings.mileageCents > 0 || earnings.tipCents > 0) && (
                    <SizableText size="$3" color="rgba(34,197,94,0.8)">
                      You earned {earnings.totalDisplay} on this delivery.
                    </SizableText>
                  )}
                </YStack>
              </View>

              {/* Show delivery photo if we have one */}
              {(photoUri || photoUrl || order?.deliveryPhotoUrl) && (
                <View style={styles.deliveredPhotoBox}>
                  <Text style={styles.deliveredPhotoLabel}>DELIVERY PHOTO</Text>
                  <Image
                    source={{ uri: photoUri ?? photoUrl ?? order?.deliveryPhotoUrl ?? '' }}
                    style={styles.deliveredPhoto}
                    resizeMode="cover"
                  />
                </View>
              )}

              <Button
                size="$4" borderRadius={12} marginTop="$4" width="100%"
                variant="outlined"
                onPress={() => router.back()}
              >
                ← Back to Orders
              </Button>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  // Step bar
  stepBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 20, marginBottom: 8,
  },
  stepItem:   { alignItems: 'center', gap: 6 },
  stepLine:   { flex: 1, height: 2, marginHorizontal: 4, marginBottom: 22 },
  stepCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepDone:   { backgroundColor: GREEN },
  stepActive: { backgroundColor: YELLOW },
  stepFuture: { backgroundColor: 'rgba(255,255,255,0.08)' },
  stepNum:    { fontSize: 13, fontWeight: '800' },
  stepLabel:  { fontSize: 11, fontWeight: '600' },

  // Earnings
  earningsBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,196,0,0.1)',
    borderWidth: 1, borderColor: 'rgba(245,196,0,0.28)',
    borderRadius: 14, marginHorizontal: 16, marginTop: 14,
    padding: 14, gap: 14,
  },
  earningsLeft:  { alignItems: 'center', minWidth: 80 },
  earningsLabel: { color: 'rgba(245,196,0,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  earningsTotal: { color: YELLOW, fontSize: 26, fontWeight: '900' },
  earningsRight: { flex: 1 },
  earningsLine:  { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 19 },

  // Addresses
  sectionHead: { marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  sectionHeadText: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11,
    fontWeight: '700', letterSpacing: 1.4,
  },
  addrCard: {
    marginHorizontal: 16, backgroundColor: CARD,
    borderRadius: 14, borderLeftWidth: 3, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  addrTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  addrEmoji:  { fontSize: 22, marginTop: 2 },
  addrLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  addrValue:  { color: 'white', fontSize: 15, fontWeight: '600', lineHeight: 22 },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 10, marginTop: 0, padding: 10,
    borderRadius: 10, borderWidth: 1,
  },
  mapBtnText: { fontSize: 14, fontWeight: '700' },

  // Customer card
  card: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  cardHead: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11,
    fontWeight: '700', letterSpacing: 1.2,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', gap: 12,
  },
  infoLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13, width: 60, flexShrink: 0, paddingTop: 1 },
  infoRight: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  infoValue: { color: 'white', fontSize: 14, fontWeight: '500', flex: 1 },
  infoTap:   { color: 'rgba(255,255,255,0.22)', fontSize: 11, paddingTop: 2 },

  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16, marginTop: 24 },

  // Action boxes
  actionBox: { marginHorizontal: 16, marginTop: 24 },
  stepInstruction: {
    color: 'rgba(255,255,255,0.45)', fontSize: 14,
    lineHeight: 20, marginBottom: 18,
  },

  // Photo
  photoSection: {
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    padding: 16,
  },
  photoTitle:    { color: 'white', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  photoRequired: { color: ORANGE, fontSize: 13, fontWeight: '600' },
  photoPreviewBox: {
    width: '100%', height: 220, borderRadius: 12,
    overflow: 'hidden', backgroundColor: '#1a1a2e',
    position: 'relative',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoUploadedBadge: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(34,197,94,0.9)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  photoUploadedText: { color: 'white', fontSize: 12, fontWeight: '700' },
  photoHint: {
    color: 'rgba(249,115,22,0.7)', fontSize: 12,
    textAlign: 'center', marginTop: 8,
  },

  // Delivered
  deliveredCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)',
    borderRadius: 14, padding: 18,
  },
  deliveredPhotoBox: { marginTop: 20 },
  deliveredPhotoLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11,
    fontWeight: '700', letterSpacing: 1.2, marginBottom: 8,
  },
  deliveredPhoto: {
    width: '100%', height: 220, borderRadius: 12,
    backgroundColor: '#1a1a2e',
  },

  // Header badge
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
});