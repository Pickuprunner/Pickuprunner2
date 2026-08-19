import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Order, useUpdateOrderStatus } from '@/lib/orders';
import { calcDriverEarnings } from '@/lib/config';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

function openNav(address: string) {
  if (!address) return;
  const encoded = encodeURIComponent(address);
  const url =
    Platform.OS === 'ios'
      ? `maps://?daddr=${encoded}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  Linking.openURL(url);
}

export interface DriverOrderCardProps {
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

export function DriverOrderCard({
  order,
  onPress,
  isMyOrder = false,
  driverAtCapacity = false,
  driverUserId,
  driverDisplayName,
}: DriverOrderCardProps) {
  const updateStatus = useUpdateOrderStatus();
  const { status } = order;
  const shortId = order.id ? order.id.slice(-6).toUpperCase() : '------';

  const miles = Number(order.distanceMiles ?? 0);
  const tipAmount = Number(order.tipAmount ?? 0);
  const earnings = calcDriverEarnings(miles, tipAmount);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const initial = (order.customerName?.trim() || 'C').charAt(0).toUpperCase();

  const statusLabel =
    status === 'pending'
      ? 'Unassigned'
      : status === 'accepted'
      ? 'Accepted'
      : status === 'picked_up'
      ? 'In Transit'
      : 'Delivered';

  const navAddress =
    status === 'accepted'
      ? order.pickupAddress
      : order.deliveryAddress;

  const handleAccept = async () => {
    if (driverAtCapacity) return;
    haptic();
    setCheckoutError(null);

    const uid = driverUserId || `guest-${Date.now()}`;
    const uname = driverDisplayName || 'Driver';

    try {
      if (!order.id) {
        throw new Error('This order is missing its ID. Refresh the Orders tab and try again.');
      }
      await updateStatus.mutateAsync({
        id: order.id,
        status: 'accepted',
        driverUserId: uid,
        driverName: uname,
      });
    } catch (err: any) {
      console.error('[Accept] Failed to accept order:', err);
      setCheckoutError(err?.message || 'Could not accept order');
    }
  };

  const handleNextStatus = () => {
    haptic();
    if (status === 'accepted') {
      updateStatus.mutate({ id: order.id, status: 'picked_up' });
    } else if (status === 'picked_up') {
      router.push(`/order/${order.id}`);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={styles.header}
      >
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.userName} numberOfLines={1}>
              {order.customerName || 'Customer'}
            </Text>
            <Text style={styles.orderId}>#{shortId}</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </TouchableOpacity>

      {/* Routes */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={styles.routesContainer}
      >
        <View style={styles.connectingLine} />

        {/* Pickup */}
        <View style={styles.routeItem}>
          <View style={[styles.routeIcon, { borderColor: '#b3c5ff' }]}>
            <MaterialIcons name="inventory-2" size={12} color="#b3c5ff" />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={[styles.routeLabel, { color: '#b3c5ff' }]}>Pick up from</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>
              {order.pickupAddress || '—'}
            </Text>
          </View>
        </View>

        {/* Dropoff */}
        <View style={styles.routeItem}>
          <View style={[styles.routeIcon, { borderColor: '#00e297' }]}>
            <MaterialIcons name="location-on" size={12} color="#00e297" />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={[styles.routeLabel, { color: '#00e297' }]}>Deliver to</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>
              {order.deliveryAddress || '—'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Footer / Pricing & Actions */}
      <View style={styles.footer}>
        <View style={styles.footerTop}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>{earnings.totalDisplay}</Text>
            <Text style={styles.tipText}>
              {earnings.tipCents > 0
                ? `${(earnings.tipCents / 100).toFixed(2)} tip`
                : '0.00 tip'}
            </Text>
          </View>
          {!!order.customerPhone && (
            <Text style={styles.phoneText}>{order.customerPhone}</Text>
          )}
        </View>

        {/* Actions Container */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={() => {
              haptic();
              openNav(navAddress);
            }}
            style={styles.mapButton}
          >
            <MaterialIcons name="near-me" size={20} color="#dfe2ef" />
            <Text style={styles.mapButtonText}>Map</Text>
          </TouchableOpacity>

          {status === 'pending' && (
            <TouchableOpacity
              onPress={handleAccept}
              disabled={updateStatus.isPending || driverAtCapacity}
              style={[
                styles.acceptButton,
                driverAtCapacity && styles.acceptButtonDisabled,
              ]}
            >
              <MaterialIcons name="local-shipping" size={20} color="#f8f7ff" />
              <Text style={styles.acceptButtonText}>
                {updateStatus.isPending
                  ? 'Accepting…'
                  : driverAtCapacity
                  ? 'Queue Full'
                  : 'Accept'}
              </Text>
            </TouchableOpacity>
          )}

          {status === 'accepted' && (
            <TouchableOpacity
              onPress={handleNextStatus}
              disabled={updateStatus.isPending}
              style={[styles.acceptButton, { backgroundColor: '#ffe399' }]}
            >
              <MaterialIcons name="inventory" size={20} color="#0f131c" />
              <Text style={[styles.acceptButtonText, { color: '#0f131c' }]}>
                {updateStatus.isPending ? '…' : 'Order Picked Up'}
              </Text>
            </TouchableOpacity>
          )}

          {status === 'picked_up' && (
            <TouchableOpacity
              onPress={handleNextStatus}
              disabled={updateStatus.isPending}
              style={[styles.acceptButton, { backgroundColor: '#00e297' }]}
            >
              <MaterialIcons name="check-circle" size={20} color="#0f131c" />
              <Text style={[styles.acceptButtonText, { color: '#0f131c' }]}>
                Complete Delivery
              </Text>
            </TouchableOpacity>
          )}

          {status === 'delivered' && (
            <View style={[styles.acceptButton, { backgroundColor: 'rgba(0, 226, 151, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 226, 151, 0.3)' }]}>
              <MaterialIcons name="check-circle" size={20} color="#00e297" />
              <Text style={[styles.acceptButtonText, { color: '#00e297' }]}>
                Delivered ✓
              </Text>
            </View>
          )}
        </View>

        {/* Error message */}
        {checkoutError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {checkoutError}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 32,
    padding: 20,
    gap: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#31353f', // surface-variant
    borderWidth: 1,
    borderColor: '#424656', // outline-variant
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffe399', // secondary
    fontSize: 14,
    fontWeight: '600',
  },
  userName: {
    color: '#dfe2ef', // on-surface
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  orderId: {
    color: 'rgba(194, 198, 216, 0.7)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.3)',
    backgroundColor: 'rgba(244, 195, 0, 0.1)',
  },
  statusText: {
    color: '#f4c300', // secondary-container
    fontSize: 10,
    fontWeight: '500',
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
    backgroundColor: '#0f131c', // background
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
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  routeAddress: {
    color: '#dfe2ef', // on-surface
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceText: {
    color: '#ffe399', // secondary
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  tipText: {
    color: '#c2c6d8', // on-surface-variant
    fontSize: 14,
  },
  phoneText: {
    color: '#c2c6d8',
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  mapButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapButtonText: {
    color: '#dfe2ef', // on-surface
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0066ff', // primary-container
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(0, 102, 255, 0.2)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  acceptButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  acceptButtonText: {
    color: '#f8f7ff', // on-primary-container
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.3)',
    marginTop: 6,
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 12,
    textAlign: 'center',
  },
});
