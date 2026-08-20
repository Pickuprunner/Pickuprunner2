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
  ScrollView,
  Linking,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useOrders, useUpdateOrderStatus, type Order } from '@/lib/orders';
import { getSelectedOrder } from '@/lib/selectedOrder';
import { blink } from '@/lib/blink';
import { calcDriverEarnings, APP_CONFIG } from '@/lib/config';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { useDriverQueue, MAX_QUEUE } from '@/lib/driverQueue';
import { useDriverId } from '@/hooks/useDriverId';
import { CustomCard, CustomLoading, SwipeSlider, useToast } from '@/components/core';

const BLUE = '#0066FF';
const GOLD = '#FFE399';
const GREEN = '#00E297';
const BG = '#0F131C';

function haptic(type: 'medium' | 'success' = 'medium') {
  if (Platform.OS === 'web') return;
  if (type === 'success') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
  }
}

function openMaps(address: string) {
  if (!address) return;
  const encoded = encodeURIComponent(address);
  const url =
    Platform.OS === 'ios'
      ? `maps://maps.apple.com/?daddr=${encoded}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  Linking.openURL(url);
}

function StepBar({ status }: { status: string }) {
  const step1done = status !== 'pending';
  const step2done = status === 'picked_up' || status === 'delivered';
  const step3done = status === 'delivered';
  const step1active = status === 'pending';
  const step2active = status === 'accepted';
  const step3active = status === 'picked_up';

  const dot = (done: boolean, active: boolean, n: number) => (
    <View
      style={[
        styles.stepCircle,
        done ? styles.stepDone : active ? styles.stepActive : styles.stepFuture,
      ]}
    >
      <Text
        style={[
          styles.stepNum,
          done || active ? { color: '#0F131C' } : { color: 'rgba(255,255,255,0.4)' },
        ]}
      >
        {done ? '✓' : n}
      </Text>
    </View>
  );

  const line = (filled: boolean) => (
    <View
      style={[
        styles.stepLine,
        { backgroundColor: filled ? GREEN : 'rgba(255,255,255,0.1)' },
      ]}
    />
  );

  const label = (text: string, active: boolean, done: boolean) => (
    <Text
      style={[
        styles.stepLabel,
        done
          ? { color: GREEN }
          : active
            ? { color: GOLD }
            : { color: 'rgba(255,255,255,0.4)' },
      ]}
    >
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
function InfoRow({
  label,
  value,
  accent,
  onPress,
  icon,
}: {
  label: string;
  value?: string | null;
  accent?: string;
  onPress?: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
}) {
  if (!value) return null;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!onPress}
      style={styles.infoRow}
    >
      <View style={styles.infoLeft}>
        {icon && <MaterialIcons name={icon} size={16} color="rgba(194, 198, 216, 0.6)" />}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={styles.infoRight}>
        <Text
          style={[styles.infoValue, accent ? { color: accent } : undefined]}
          numberOfLines={2}
        >
          {value}
        </Text>
        {onPress && <MaterialIcons name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />}
      </View>
    </TouchableOpacity>
  );
}

// ── Address card ─────────────────────────────────────────────────────────────
function AddressCard({
  icon,
  label,
  address,
  accent,
  onNavigate,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  address: string;
  accent: string;
  onNavigate: () => void;
}) {
  return (
    <CustomCard variant="glass" style={styles.addrCard}>
      <View style={styles.addrTop}>
        <View style={[styles.addrIconBox, { borderColor: accent }]}>
          <MaterialIcons name={icon} size={16} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.addrLabel, { color: accent }]}>{label}</Text>
          <Text style={styles.addrValue}>{address || '(not set)'}</Text>
        </View>
      </View>
      {!!address && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.mapBtn}
          onPress={onNavigate}
        >
          <MaterialIcons name="near-me" size={16} color="#DFE2EF" />
          <Text style={styles.mapBtnText}>Open in Maps</Text>
        </TouchableOpacity>
      )}
    </CustomCard>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const updateStatus = useUpdateOrderStatus();
  const { user } = useAuth();
  const driverId = useDriverId();
  const { data: allOrders = [] } = useOrders();
  const { queueCount, atCapacity } = useDriverQueue(allOrders, driverId);

  const [order, setOrder] = useState<Order | null>(getSelectedOrder);
  const [loading, setLoading] = useState(!getSelectedOrder());
  const [status, setStatus] = useState<string>(getSelectedOrder()?.status ?? 'pending');

  // Action states
  const [accepting, setAccepting] = useState(false);
  const [pickingUp, setPickingUp] = useState(false);
  const [delivering, setDelivering] = useState(false);

  // Delivery photo
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
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
        const found = allOrders?.find((o) => o.id === fetchId);
        if (found) {
          setOrder(found);
          setStatus(found.status);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, allOrders]);

  if (!order && !loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#FF4D4F" />
          <Text style={styles.errorTitle}>Order not found</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const miles = Number(order?.distanceMiles ?? 0);
  const earnings = order ? calcDriverEarnings(miles, Number(order.tipAmount ?? 0)) : null;
  const shortId = order?.id?.slice(-6).toUpperCase() ?? '------';
  const isMeetCustomer = !!order?.items?.includes('[MEET CUSTOMER]');

  const getStatusBadge = () => {
    switch (status) {
      case 'delivered':
        return { label: 'DELIVERED', color: GREEN, bg: 'rgba(0, 226, 151, 0.12)', border: 'rgba(0, 226, 151, 0.3)' };
      case 'picked_up':
        return { label: 'IN TRANSIT', color: GREEN, bg: 'rgba(0, 226, 151, 0.12)', border: 'rgba(0, 226, 151, 0.3)' };
      case 'accepted':
        return { label: 'ACCEPTED', color: GOLD, bg: 'rgba(255, 227, 153, 0.12)', border: 'rgba(255, 227, 153, 0.3)' };
      case 'pending':
      default:
        return { label: 'UNASSIGNED', color: '#F4C300', bg: 'rgba(244, 195, 0, 0.1)', border: 'rgba(244, 195, 0, 0.3)' };
    }
  };

  const badge = getStatusBadge();

  // ── Photo helpers ────────────────────────────────────────────────────────
  async function pickPhoto(source: 'camera' | 'library') {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera' && Platform.OS !== 'web') {
        const { status: perm } = await ImagePicker.requestCameraPermissionsAsync();
        if (perm !== 'granted') {
          Alert.alert(
            'Camera permission needed',
            'Please allow camera access in Settings to take a delivery photo.'
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
      }
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPhotoUri(asset.uri);
      await uploadPhoto(asset.uri);
    } catch (err: any) {
      console.error('[pickPhoto] Error:', err?.message || err);
      Alert.alert(
        'Camera Error',
        `${err?.message || 'Could not open camera.'}\n\nUse "Choose File" instead.`
      );
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

      publicUrl = uri;
      setPhotoUrl(publicUrl);
      showToast('Photo uploaded', { type: 'success' });
    } catch (e: any) {
      console.error('[uploadPhoto] Error:', e?.message || e);
      showToast('Upload failed', {
        description: `${e?.message || 'unknown error'}. Please retry.`,
        type: 'error',
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
    haptic('medium');
    setAccepting(true);
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        status: 'accepted',
        driverUserId: driverId,
        driverName: user?.displayName ?? user?.email ?? driverId?.slice(0, 8),
      });
      setStatus('accepted');
      showToast('Order Accepted!', {
        description: 'Head to pickup address.',
        type: 'success',
      });
    } catch (e: any) {
      showToast('Error', { description: e?.message || 'Could not accept order', type: 'error' });
    } finally {
      setAccepting(false);
    }
  }

  async function doPickUp() {
    if (!order) return;
    haptic('medium');
    setPickingUp(true);
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'picked_up' });
      setStatus('picked_up');

      showToast('Order Picked Up', {
        description: 'Head to delivery address to complete.',
        type: 'success',
      });
    } catch {
      showToast('Error', { description: 'Could not update status', type: 'error' });
    } finally {
      setPickingUp(false);
    }
  }

  async function doDeliver() {
    if (!order) return;
    if (!photoUrl) {
      Alert.alert(
        'Delivery Photo Required',
        'Please take or upload a photo before completing this delivery.'
      );
      return;
    }
    haptic('success');
    setDelivering(true);
    try {
      const updated = await updateStatus.mutateAsync({
        id: order.id,
        status: 'delivered',
        deliveryPhotoUrl: photoUrl ?? undefined,
      });
      setStatus('delivered');
      const notification = updated.deliveryNotification;
      const message = notification?.sent
        ? `Customer notified with delivery photo. You earned ${earnings?.totalDisplay ?? ''}.`
        : `Delivered and earned ${earnings?.totalDisplay ?? ''}.`;
      showToast(notification?.sent ? 'Delivered! 🎉' : 'Delivered', {
        description: message,
        type: notification?.sent ? 'success' : 'warning',
      });
    } catch (e: any) {
      showToast('Error', { description: e?.message || 'Could not mark delivered', type: 'error' });
    } finally {
      setDelivering(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backIconButton}
          activeOpacity={0.8}
        >
          <MaterialIcons name="arrow-back" size={22} color="#DFE2EF" />
        </TouchableOpacity>

        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {order?.customerName || 'Order Details'}
          </Text>
          <Text style={styles.headerSubtitle}>#{shortId}</Text>
        </View>

        <View
          style={[
            styles.badge,
            { backgroundColor: badge.bg, borderColor: badge.border },
          ]}
        >
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      {loading ? (
        <CustomLoading variant="fullscreen" text="Loading order details…" />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <StepBar status={status} />

          {earnings && (
            <CustomCard variant="glass" style={styles.earningsCard}>
              <View style={styles.earningsRow}>
                <View>
                  <Text style={styles.earningsLabel}>YOUR EARNINGS</Text>
                  <Text style={styles.earningsTotal}>{earnings.totalDisplay}</Text>
                </View>
                <View style={styles.earningsBreakdown}>
                  {earnings.mileageCents > 0 && (
                    <Text style={styles.earningsLine}>
                      Mileage ({miles.toFixed(1)} mi): ${(earnings.mileageCents / 100).toFixed(2)}
                    </Text>
                  )}
                  {earnings.tipCents > 0 && (
                    <Text style={[styles.earningsLine, { color: GREEN }]}>
                      Tip: +${(earnings.tipCents / 100).toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
            </CustomCard>
          )}

          <View style={styles.sectionHead}>
            <Text style={styles.sectionHeadText}>PICK UP FROM</Text>
          </View>
          <AddressCard
            icon="inventory-2"
            label="Pickup Runner"
            address={order?.pickupAddress ?? ''}
            accent="#B3C5FF"
            onNavigate={() => openMaps(order?.pickupAddress ?? '')}
          />

          <View style={styles.sectionHead}>
            <Text style={styles.sectionHeadText}>DELIVER TO</Text>
          </View>
          <AddressCard
            icon="location-on"
            label="Customer Address"
            address={order?.deliveryAddress ?? ''}
            accent={GREEN}
            onNavigate={() => openMaps(order?.deliveryAddress ?? '')}
          />

          <View style={styles.sectionHead}>
            <Text style={styles.sectionHeadText}>CUSTOMER DETAILS</Text>
          </View>
          <CustomCard variant="glass" style={styles.customerCard}>
            <InfoRow
              icon="person"
              label="Name"
              value={order?.customerName}
            />
            <InfoRow
              icon="phone"
              label="Phone"
              value={order?.customerPhone}
              accent="#60A5FA"
              onPress={() =>
                order?.customerPhone ? Linking.openURL(`tel:${order.customerPhone}`) : undefined
              }
            />
            {!!order?.items && order.items !== 'N/A' && (
              <InfoRow
                icon="shopping-bag"
                label="Items"
                value={order.items}
              />
            )}
            <InfoRow
              icon="meeting-room"
              label="Delivery"
              value={isMeetCustomer ? 'Meet at Door' : 'Leave at Door'}
              accent={isMeetCustomer ? '#60A5FA' : undefined}
            />
          </CustomCard>

          {status === 'pending' && (
            <View style={styles.actionBox}>
              <Text style={styles.stepInstruction}>
                Review the pickup and delivery addresses above, then accept this order to begin.
              </Text>
              <SwipeSlider
                title="Slide to Accept"
                completedTitle="Order Accepted"
                onSwipeComplete={doAccept}
                loading={accepting}
                disabled={accepting || atCapacity}
                variant="primary"
                style={{ marginTop: 8 }}
              />
            </View>
          )}

          {status === 'accepted' && (
            <View style={styles.actionBox}>
              <Text style={styles.stepInstruction}>
                Head to the store and collect the order, then tap below once you have it.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.secondaryActionButton}
                onPress={() => openMaps(order?.pickupAddress ?? '')}
              >
                <MaterialIcons name="near-me" size={20} color="#DFE2EF" />
                <Text style={styles.secondaryActionText}>Navigate to Pickup</Text>
              </TouchableOpacity>

              <SwipeSlider
                title="Slide to Confirm Pickup"
                completedTitle="Pickup Confirmed"
                onSwipeComplete={doPickUp}
                loading={pickingUp}
                disabled={pickingUp}
                variant="primary"
                icon="inventory"
                style={{ marginTop: 12 }}
              />
            </View>
          )}

          {status === 'picked_up' && (
            <View style={styles.actionBox}>
              <Text style={styles.stepInstruction}>
                {isMeetCustomer
                  ? 'The customer requested to meet at door. Complete handoff and capture a quick photo.'
                  : 'Deliver the order, take a photo at the door, and confirm delivery.'}
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.secondaryActionButton}
                onPress={() => openMaps(order?.deliveryAddress ?? '')}
              >
                <MaterialIcons name="near-me" size={20} color="#DFE2EF" />
                <Text style={styles.secondaryActionText}>Navigate to Delivery</Text>
              </TouchableOpacity>

              <CustomCard variant="glass" style={styles.photoBox}>
                <View style={styles.photoHeader}>
                  <MaterialIcons name="camera-alt" size={20} color="#DFE2EF" />
                  <Text style={styles.photoTitle}>Delivery Photo</Text>
                  <Text style={styles.photoRequired}>(Required)</Text>
                </View>

                {(photoUri || photoUrl) && (
                  <View style={styles.photoPreviewWrapper}>
                    <Image
                      source={{ uri: photoUri ?? photoUrl ?? '' }}
                      style={styles.photoPreview}
                      resizeMode="cover"
                    />
                    {uploadingPhoto && (
                      <View style={styles.photoUploadingOverlay}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text style={styles.photoUploadingText}>Uploading…</Text>
                      </View>
                    )}
                    {!uploadingPhoto && photoUrl && (
                      <View style={styles.photoUploadedBadge}>
                        <Text style={styles.photoUploadedText}>✓ Uploaded</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.photoPickersRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.photoPickerBtn}
                    onPress={() => pickPhoto('camera')}
                    disabled={uploadingPhoto}
                  >
                    <MaterialIcons name="photo-camera" size={18} color="#FFE399" />
                    <Text style={styles.photoPickerText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.photoPickerBtn}
                    onPress={() => pickPhoto('library')}
                    disabled={uploadingPhoto}
                  >
                    <MaterialIcons name="photo-library" size={18} color="#60A5FA" />
                    <Text style={styles.photoPickerText}>Choose File</Text>
                  </TouchableOpacity>
                </View>
              </CustomCard>

              <SwipeSlider
                title="Slide to Complete Delivery"
                completedTitle="Delivery Completed"
                onSwipeComplete={doDeliver}
                loading={delivering}
                disabled={delivering || uploadingPhoto || !photoUrl}
                variant="primary"
                completedIcon="check-circle"
                style={{ marginTop: 16 }}
              />
            </View>
          )}

          {status === 'delivered' && (
            <View style={styles.actionBox}>
              <CustomCard variant="glass" style={styles.deliveredCard}>
                <MaterialIcons name="celebration" size={36} color={GREEN} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliveredTitle}>Order Delivered!</Text>
                  {earnings && (
                    <Text style={styles.deliveredSubtitle}>
                      You earned {earnings.totalDisplay} on this delivery.
                    </Text>
                  )}
                </View>
              </CustomCard>

              {(photoUri || photoUrl || order?.deliveryPhotoUrl) && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.sectionHeadText}>DELIVERY PHOTO</Text>
                  <Image
                    source={{
                      uri: photoUri ?? photoUrl ?? order?.deliveryPhotoUrl ?? '',
                    }}
                    style={styles.deliveredPhoto}
                    resizeMode="cover"
                  />
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.secondaryActionButton, { marginTop: 20 }]}
                onPress={() => router.back()}
              >
                <Text style={styles.secondaryActionText}>← Back to Orders</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    color: '#DFE2EF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(194, 198, 216, 0.6)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scroll: {
    paddingBottom: 40,
  },
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 6,
    marginBottom: 20,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: {
    backgroundColor: GREEN,
  },
  stepActive: {
    backgroundColor: GOLD,
  },
  stepFuture: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  earningsCard: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    color: 'rgba(194, 198, 216, 0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  earningsTotal: {
    color: GOLD,
    fontSize: 28,
    fontWeight: '800',
  },
  earningsBreakdown: {
    alignItems: 'flex-end',
    gap: 4,
  },
  earningsLine: {
    color: '#C2C6D8',
    fontSize: 12,
  },
  sectionHead: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHeadText: {
    color: 'rgba(194, 198, 216, 0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  addrCard: {
    marginHorizontal: 20,
    gap: 12,
  },
  addrTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addrIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  addrLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  addrValue: {
    color: '#DFE2EF',
    fontSize: 14,
    lineHeight: 20,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 8,
  },
  mapBtnText: {
    color: '#DFE2EF',
    fontSize: 13,
    fontWeight: '600',
  },
  customerCard: {
    marginHorizontal: 20,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    color: 'rgba(194, 198, 216, 0.7)',
    fontSize: 13,
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '60%',
  },
  infoValue: {
    color: '#DFE2EF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBox: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  stepInstruction: {
    color: 'rgba(194, 198, 216, 0.7)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  primaryActionButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0066FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(0, 102, 255, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryActionText: {
    color: '#F8F7FF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    color: '#DFE2EF',
    fontSize: 14,
    fontWeight: '600',
  },
  photoBox: {
    marginTop: 16,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  photoTitle: {
    color: '#DFE2EF',
    fontSize: 14,
    fontWeight: '700',
  },
  photoRequired: {
    color: '#FFA940',
    fontSize: 12,
  },
  photoPreviewWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginBottom: 12,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoUploadingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  photoUploadedBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 226, 151, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoUploadedText: {
    color: '#0F131C',
    fontSize: 11,
    fontWeight: '700',
  },
  photoPickersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoPickerBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPickerText: {
    color: '#DFE2EF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionDisabled: {
    opacity: 0.5,
  },
  deliveredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderColor: 'rgba(0, 226, 151, 0.25)',
  },
  deliveredTitle: {
    color: GREEN,
    fontSize: 18,
    fontWeight: '700',
  },
  deliveredSubtitle: {
    color: 'rgba(0, 226, 151, 0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  deliveredPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  errorTitle: {
    color: '#DFE2EF',
    fontSize: 18,
    fontWeight: '700',
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtnText: {
    color: '#DFE2EF',
    fontSize: 14,
    fontWeight: '600',
  },
});