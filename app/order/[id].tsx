import React, { useState, useEffect, useReducer } from 'react';
import {
  ScrollView,
  Linking,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { useOrder, useOrders, useUpdateOrderStatus, useClaimOrder, type Order } from '@/lib/orders';
import { connectApi } from '@/apis/connect';
import { useConnectStatus, useConnectOnboard, openStripeOnboardingSession } from '@/lib/stripeConnect';
import { getSelectedOrder, setSelectedOrder } from '@/lib/selectedOrder';
import { calcDriverEarnings } from '@/lib/config';
import { useAuth } from '@/hooks/useAuth';
import { useDriverQueue, MAX_QUEUE } from '@/lib/driverQueue';
import { useDriverId } from '@/hooks/useDriverId';
import { CustomCard, CustomLoading, CustomConfirmModal, useToast } from '@/components/core';
import { colors } from '@/constants/design';

import {
  StepBar,
  RouteTimelineCard,
  CustomerInfoCard,
  DeliveryPhotoCard,
  DeliveredSuccessCard,
  StickyActionFooter,
  deliveryFSM,
  type DeliveryState,
} from '@/components/Orders';

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

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fetchId = Array.isArray(id) ? id[0] : id;
  const updateStatus = useUpdateOrderStatus();
  const claimOrder = useClaimOrder();
  const { user } = useAuth();
  const driverId = useDriverId();
  const { data: allOrders = [] } = useOrders();
  const { queueCount, atCapacity } = useDriverQueue(allOrders, driverId);

  const { data: connectStatus, refetch: refetchConnect } = useConnectStatus(driverId);
  const connectOnboard = useConnectOnboard();
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const isStripeReady = Boolean(connectStatus?.connected && connectStatus?.payoutsEnabled) || Boolean(user?.stripeAccountId);

  const handleSetupPayouts = async () => {
    setOnboardingLoading(true);
    try {
      const res = await connectOnboard.mutateAsync({
        driverUserId: driverId,
        driverEmail: user?.email,
      });
      if (res?.url) {
        await openStripeOnboardingSession(res.url);
      }
      await refetchConnect();
      setShowStripeModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Could not start bank onboarding', 'error');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const { data: order, isLoading: loading } = useOrder(fetchId);

  const [fsm, dispatch] = useReducer(deliveryFSM, {
    status: (getSelectedOrder()?.status as DeliveryState) ?? 'pending',
    photoUri: null,
    photoUrl: getSelectedOrder()?.deliveryPhotoUrl ?? null,
    uploadingPhoto: false,
    userDriven: false,
  });

  const { status, photoUri, photoUrl, uploadingPhoto } = fsm;

  useEffect(() => {
    if (order) {
      setSelectedOrder(order);
      dispatch({
        type: 'HYDRATE',
        status: (order.status as DeliveryState) || 'pending',
        photoUrl: order.deliveryPhotoUrl || order.delivery_photo_url,
      });
    }
  }, [order?.status, order?.deliveryPhotoUrl, order?.delivery_photo_url]);

  if (!order && !loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Order not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const miles = Number(order?.distanceMiles ?? 0);
  const earnings = order ? calcDriverEarnings(miles, Number(order.tipAmount ?? 0)) : null;
  const shortId = order?.id?.slice(-6).toUpperCase() ?? '------';
  const hasPhoto = !!(photoUrl || photoUri || order?.deliveryPhotoUrl);

  const getStatusBadge = () => {
    switch (status) {
      case 'delivered':
        return { label: 'DELIVERED', color: colors.tertiary, bg: colors.greenAlpha15, border: colors.greenAlpha40 };
      case 'picked_up':
      case 'en_route':
      case 'shopping':
        return { label: 'IN TRANSIT', color: colors.tertiary, bg: colors.greenAlpha15, border: colors.greenAlpha40 };
      case 'assigned':
      case 'accepted':
        return { label: 'ACCEPTED', color: colors.secondary, bg: colors.accentAlpha15, border: colors.accentAlpha35 };
      case 'cancelled':
        return { label: 'CANCELLED', color: colors.error, bg: 'rgba(255, 92, 92, 0.15)', border: 'rgba(255, 92, 92, 0.35)' };
      case 'pending':
      default:
        return { label: 'UNASSIGNED', color: colors.accent, bg: colors.accentAlpha12, border: colors.accentAlpha30 };
    }
  };

  const badge = getStatusBadge();

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
      dispatch({ type: 'SET_PHOTO', uri: asset.uri });
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
    dispatch({ type: 'SET_UPLOADING', uploading: true });
    try {
      const ext = uri.split('.').pop()?.split('?')[0]?.replace('jpg', 'jpeg') ?? 'jpeg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const filename = `delivery_${order!.id}_${Date.now()}.${ext}`;
      const storagePath = `delivery-photos/${filename}`;

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const resp = await fetch(uri);
        const blob = await resp.blob();
        formData.append('file', new File([blob], filename, { type: mimeType }));
      } else {
        formData.append('file', { uri, type: mimeType, name: filename } as any);
      }
      formData.append('path', storagePath);

      dispatch({ type: 'SET_PHOTO', uri });
      showToast('Photo uploaded', { type: 'success' });
    } catch (e: any) {
      console.error('[uploadPhoto] Error:', e?.message || e);
      showToast('Upload failed', {
        description: `${e?.message || 'unknown error'}. Please retry.`,
        type: 'error',
      });
    } finally {
      dispatch({ type: 'SET_UPLOADING', uploading: false });
    }
  }

  async function doAccept() {
    if (!isStripeReady) {
      setShowStripeModal(true);
      return;
    }
    if (atCapacity) {
      Alert.alert(
        `Queue Full (${MAX_QUEUE}/${MAX_QUEUE})`,
        `You already have ${MAX_QUEUE} active orders. Complete or deliver one before accepting another.`,
        [{ text: 'OK' }]
      );
      return;
    }
    haptic('medium');

    if (order) {
      const driverName = user?.displayName ?? user?.email ?? driverId?.slice(0, 8) ?? 'Driver';
      const effectiveDriverId = driverId || 'driver_default';
      try {
        await claimOrder.mutateAsync({
          orderId: order.id,
          driverUserId: effectiveDriverId,
          driverName,
        });

        await updateStatus.mutateAsync({
          id: order.id,
          status: 'accepted',
          driverUserId: driverId,
          driverName,
        });

        dispatch({ type: 'ACCEPT_ORDER' });
        showToast('Order Accepted!', {
          description: 'Head to pickup address.',
          type: 'success',
        });
      } catch (claimErr: any) {
        console.warn('[doAccept] claimOrder failed:', claimErr);
        const errorMsg = claimErr?.data?.message || claimErr?.message || 'Could not claim order';
        const code = claimErr?.data?.code;
        const isAccreditationError =
          claimErr?.status === 403 &&
          (code === 'not_started' ||
            code === 'in_progress' ||
            code === 'under_review' ||
            code === 'rejected' ||
            code === 'license_expired' ||
            code === 'insurance_expired');

        if (isAccreditationError) {
          Alert.alert('Accreditation Required', errorMsg, [
            { text: 'Complete Accreditation', onPress: () => router.push('/(auth)/driver-verification') },
            { text: 'Cancel', style: 'cancel' }
          ]);
        } else {
          showToast(errorMsg, { type: 'error' });
        }
      }
    }
  }

  function doPickUp() {
    haptic('medium');
    dispatch({ type: 'CONFIRM_PICKUP' });
    showToast('Order Picked Up', {
      description: 'Head to delivery address to complete.',
      type: 'success',
    });

    if (order) {
      updateStatus.mutateAsync({ id: order.id, status: 'picked_up' }).catch(() => { });
    }
  }

  async function doDeliver() {
    if (!hasPhoto) {
      Alert.alert(
        'Delivery Photo Required',
        'Please take, choose, or mock fill a photo before completing this delivery.'
      );
      return;
    }
    haptic('success');
    dispatch({ type: 'COMPLETE_DELIVERY' });
    showToast('Delivered! 🎉', {
      description: `You earned ${earnings?.totalDisplay ?? '$8.55'}.`,
      type: 'success',
    });

    if (order) {
      const photo = (photoUrl ?? photoUri ?? order?.deliveryPhotoUrl) || undefined;

      updateStatus.mutateAsync({
        id: order.id,
        status: 'delivered',
        deliveryPhotoUrl: photo,
      }).catch(() => { });

      try {
        const transferRes = await connectApi.transferEarnings(order.id);
        console.log('[doDeliver] connectApi.transferEarnings response:', transferRes);
      } catch (transferErr: any) {
        console.warn('[doDeliver] connectApi.transferEarnings failed:', transferErr?.message || transferErr);
      }
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => {
            haptic();
            router.back();
          }}
          style={styles.backIconButton}
          activeOpacity={0.8}
        >
          <MaterialIcons name="chevron-left" size={28} color={colors.onSurface} />
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
        <>
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
                      <Text style={[styles.earningsLine, { color: colors.tertiary }]}>
                        Tip: +${(earnings.tipCents / 100).toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              </CustomCard>
            )}

            <View style={styles.sectionHead}>
              <Text style={styles.sectionHeadText}>ROUTE & STOPS</Text>
            </View>
            <RouteTimelineCard
              pickupAddress={order?.pickupAddress ?? ''}
              deliveryAddress={order?.deliveryAddress ?? ''}
              distanceMiles={miles}
              status={status}
              onNavigatePickup={() => openMaps(order?.pickupAddress ?? '')}
              onNavigateDelivery={() => openMaps(order?.deliveryAddress ?? '')}
            />

            <View style={styles.sectionHead}>
              <Text style={styles.sectionHeadText}>CUSTOMER DETAILS</Text>
            </View>
            <CustomerInfoCard order={order} />

            {status === 'picked_up' && (
              <View style={{ marginHorizontal: 20, marginTop: 12 }}>
                <DeliveryPhotoCard
                  photoUri={photoUri}
                  photoUrl={photoUrl}
                  uploadingPhoto={uploadingPhoto}
                  onPickPhoto={pickPhoto}
                  onMockFill={() => {
                    const sampleUri =
                      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60';
                    dispatch({ type: 'SET_PHOTO', uri: sampleUri });
                    showToast('Mock Photo Filled', { type: 'success' });
                  }}
                />
              </View>
            )}

            {status === 'delivered' && (
              <DeliveredSuccessCard
                earningsTotalDisplay={earnings?.totalDisplay}
                photoUrl={photoUrl ?? photoUri ?? order?.deliveryPhotoUrl}
              />
            )}

            <View style={{ height: 110 }} />
          </ScrollView>

          <StickyActionFooter
            status={status}
            hasPhoto={hasPhoto}
            uploadingPhoto={uploadingPhoto}
            atCapacity={atCapacity}
            bottomInset={insets.bottom}
            onAccept={doAccept}
            onPickUp={doPickUp}
            onDeliver={doDeliver}
            onBack={() => router.back()}
          />
        </>
      )}

      <CustomConfirmModal
        visible={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        onConfirm={handleSetupPayouts}
        variant="warning"
        title="Bank Account Setup Required"
        message="You need to connect your bank account via Stripe before accepting orders. This ensures you can receive payouts for your completed deliveries."
        confirmText="Set Up Payouts"
        cancelText="Maybe Later"
        iconName="account-balance"
        confirmIconName="arrow-forward"
        loading={onboardingLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: '700',
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.glassLevel2Bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
  },
  backBtnText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassLevel2Border,
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
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
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  earningsTotal: {
    color: colors.secondary,
    fontSize: 28,
    fontWeight: '800',
  },
  earningsBreakdown: {
    alignItems: 'flex-end',
    gap: 4,
  },
  earningsLine: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  sectionHead: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeadText: {
    color: 'rgba(194, 198, 216, 0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

});