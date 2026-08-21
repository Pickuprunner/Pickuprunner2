import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Order, useUpdateOrderStatus } from '@/lib/orders';
import { calcDriverEarnings } from '@/lib/config';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { CustomCard, useToast } from '@/components/core';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
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

export type OrderStatusVariant = 'pending' | 'accepted' | 'picked_up' | 'delivered';

export interface DriverOrderCardProps {
  order: Order;
  variant?: OrderStatusVariant;
  onPress?: () => void;
  isMyOrder?: boolean;
  driverAtCapacity?: boolean;
  driverUserId?: string;
  driverDisplayName?: string;
  onAccept?: () => void | Promise<void>;
  onPickup?: () => void | Promise<void>;
  onDeliver?: () => void | Promise<void>;
  showPhone?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function DriverOrderCard({
  order,
  variant,
  onPress,
  isMyOrder = false,
  driverAtCapacity = false,
  driverUserId,
  driverDisplayName,
  onAccept,
  onPickup,
  onDeliver,
  showPhone = true,
  style,
}: DriverOrderCardProps) {
  const { showToast } = useToast();
  const updateStatus = useUpdateOrderStatus();
  const currentStatus: OrderStatusVariant = variant || (order.status as OrderStatusVariant) || 'pending';
  const shortId = order.id ? order.id.slice(-6).toUpperCase() : '------';

  const miles = Number(order.distanceMiles ?? 0);
  const tipAmount = Number(order.tipAmount ?? 0);
  const earnings = calcDriverEarnings(miles, tipAmount);
  const [actionError, setActionError] = useState<string | null>(null);

  const initial = (order.customerName?.trim() || 'C').charAt(0).toUpperCase();

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'accepted':
        return { label: 'ACCEPTED', color: '#FFE399', bg: 'rgba(255, 227, 153, 0.12)', border: 'rgba(255, 227, 153, 0.3)' };
      case 'picked_up':
        return { label: 'IN TRANSIT', color: '#00E297', bg: 'rgba(0, 226, 151, 0.12)', border: 'rgba(0, 226, 151, 0.3)' };
      case 'delivered':
        return { label: 'DELIVERED', color: '#00E297', bg: 'rgba(0, 226, 151, 0.12)', border: 'rgba(0, 226, 151, 0.3)' };
      case 'pending':
      default:
        return { label: 'UNASSIGNED', color: '#F4C300', bg: 'rgba(244, 195, 0, 0.1)', border: 'rgba(244, 195, 0, 0.3)' };
    }
  };

  const badge = getStatusBadge();
  const navAddress = currentStatus === 'accepted' ? order.pickupAddress : order.deliveryAddress;

  const handleDefaultAccept = async () => {
    if (driverAtCapacity) {
      showToast('Queue Limit Reached', {
        type: 'warning',
        description: 'Complete existing deliveries before accepting more',
      });
      return;
    }
    haptic();
    setActionError(null);

    if (onAccept) {
      await onAccept();
      return;
    }

    const uid = driverUserId || `guest-${Date.now()}`;
    const uname = driverDisplayName || 'Driver';

    try {
      if (!order.id) throw new Error('Missing order ID.');
      await updateStatus.mutateAsync({
        id: order.id,
        status: 'accepted',
        driverUserId: uid,
        driverName: uname,
      });
      showToast('Order Accepted!', {
        type: 'success',
        description: `Added #${shortId} to your active deliveries`,
      });
    } catch (err: any) {
      console.error('[DriverOrderCard Accept Error]:', err);
      setActionError(err?.message || 'Could not accept order');
      showToast(err?.message || 'Could not accept order', 'error');
    }
  };

  const handleDefaultPickup = async () => {
    haptic();
    setActionError(null);
    if (onPickup) {
      await onPickup();
      return;
    }
    updateStatus.mutate(
      { id: order.id, status: 'picked_up' },
      {
        onSuccess: () => {
          showToast('Order Picked Up', {
            type: 'info',
            description: `En route to ${order.customerName || 'customer'}`,
          });
        },
        onError: (err: any) => {
          showToast(err?.message || 'Pickup update failed', 'error');
        },
      }
    );
  };

  const handleDefaultDeliver = async () => {
    haptic();
    if (onDeliver) {
      await onDeliver();
      return;
    }
    router.push(`/order/${order.id}`);
  };

  // Header Slot
  const headerNode = (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userTextCol}>
          <Text style={styles.userName} numberOfLines={1}>
            {order.customerName || 'Customer'}
          </Text>
          <Text style={styles.orderId}>#{shortId}</Text>
        </View>
      </View>

      <View style={styles.badgesWrapper}>
        {isMyOrder && currentStatus === 'pending' && (
          <View style={styles.mineBadge}>
            <Text style={styles.mineBadgeText}>YOURS</Text>
          </View>
        )}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: badge.bg, borderColor: badge.border },
          ]}
        >
          <Text style={[styles.statusText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      </View>
    </View>
  );

  // Footer Slot
  const footerNode = (
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

        {showPhone && !!order.customerPhone && (
          <Text style={styles.phoneText}>{order.customerPhone}</Text>
        )}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={() => {
            haptic();
            openNav(navAddress ?? '');
          }}
          style={styles.mapButton}
        >
          <MaterialIcons name="near-me" size={20} color="#dfe2ef" />
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>

        {currentStatus === 'pending' && (
          <TouchableOpacity
            onPress={handleDefaultAccept}
            disabled={updateStatus.isPending || driverAtCapacity}
            style={[
              styles.actionButton,
              driverAtCapacity && styles.actionButtonDisabled,
            ]}
          >
            <MaterialIcons name="local-shipping" size={20} color="#f8f7ff" />
            <Text style={styles.actionButtonText}>
              {updateStatus.isPending
                ? 'Accepting…'
                : driverAtCapacity
                  ? 'Queue Full'
                  : 'Accept'}
            </Text>
          </TouchableOpacity>
        )}

        {currentStatus === 'accepted' && (
          <TouchableOpacity
            onPress={handleDefaultPickup}
            disabled={updateStatus.isPending}
            style={styles.actionButton}
          >
            <MaterialIcons name="inventory" size={20} color="#f8f7ff" />
            <Text style={styles.actionButtonText}>
              {updateStatus.isPending ? '…' : 'Picked Up'}
            </Text>
          </TouchableOpacity>
        )}

        {currentStatus === 'picked_up' && (
          <TouchableOpacity
            onPress={handleDefaultDeliver}
            disabled={updateStatus.isPending}
            style={styles.actionButton}
          >
            <MaterialIcons name="check-circle" size={20} color="#f8f7ff" />
            <Text style={styles.actionButtonText}>Deliver</Text>
          </TouchableOpacity>
        )}

        {currentStatus === 'delivered' && (
          <View style={styles.deliveredBadgeButton}>
            <MaterialIcons name="check-circle" size={20} color="#00e297" />
            <Text style={styles.deliveredBadgeText}>Delivered ✓</Text>
          </View>
        )}
      </View>

      {actionError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {actionError}</Text>
        </View>
      )}
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
              {order.pickupAddress || '—'}
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
              {order.deliveryAddress || '—'}
            </Text>
          </View>
        </View>
      </View>
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
  badgesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mineBadge: {
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0, 102, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.4)',
  },
  mineBadgeText: {
    color: '#60A5FA',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  routeAddress: {
    color: '#dfe2ef',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'column',
    gap: 16,
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
    color: '#ffe399',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  tipText: {
    color: '#c2c6d8',
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
    color: '#dfe2ef',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0066ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(0, 102, 255, 0.25)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  actionButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#f8f7ff',
    fontSize: 14,
    fontWeight: '600',
  },
  deliveredBadgeButton: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deliveredBadgeText: {
    color: '#00e297',
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
