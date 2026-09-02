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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

import { openMapsNavigation } from '@/lib/maps';


function callPhone(phone: string) {
  if (!phone) return;
  const cleaned = phone.replace(/[^0-9+]/g, '');
  Linking.openURL(`tel:${cleaned}`);
}

export interface DriverMyOrderCardProps {
  order: Order;
  driverUserId?: string;
  driverDisplayName?: string;
  onPress?: () => void;
  onPickup?: () => void | Promise<void>;
  onDeliver?: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
}

export function DriverMyOrderCard({
  order,
  driverUserId,
  driverDisplayName,
  onPress,
  onPickup,
  onDeliver,
  style,
}: DriverMyOrderCardProps) {
  const { showToast } = useToast();
  const updateStatus = useUpdateOrderStatus();
  const status = order.status || 'assigned';
  const shortId = order.id ? order.id.slice(-6).toUpperCase() : '------';

  const miles = Number(order.distanceMiles ?? 0);
  const tipAmount = Number(order.tipAmount ?? 0);
  const earnings = calcDriverEarnings(miles, tipAmount);
  const [actionError, setActionError] = useState<string | null>(null);

  const initial = (order.customerName?.trim() || 'C').charAt(0).toUpperCase();

  const getStatusBadge = () => {
    switch (status) {
      case 'assigned':
      case 'accepted':
        return { label: 'ASSIGNED', color: '#FFE399', bg: 'rgba(255, 227, 153, 0.12)', border: 'rgba(255, 227, 153, 0.3)' };
      case 'shopping':
        return { label: 'SHOPPING', color: '#FFE399', bg: 'rgba(255, 227, 153, 0.12)', border: 'rgba(255, 227, 153, 0.3)' };
      case 'picked_up':
      case 'en_route':
        return { label: 'IN TRANSIT', color: '#00E297', bg: 'rgba(0, 226, 151, 0.12)', border: 'rgba(0, 226, 151, 0.3)' };
      case 'delivered':
        return { label: 'DELIVERED', color: '#00E297', bg: 'rgba(0, 226, 151, 0.12)', border: 'rgba(0, 226, 151, 0.3)' };
      case 'cancelled':
        return { label: 'CANCELLED', color: '#FF5C5C', bg: 'rgba(255, 92, 92, 0.12)', border: 'rgba(255, 92, 92, 0.3)' };
      default:
        return { label: status.toUpperCase(), color: '#F4C300', bg: 'rgba(244, 195, 0, 0.1)', border: 'rgba(244, 195, 0, 0.3)' };
    }
  };

  const badge = getStatusBadge();
  const navAddress = status === 'assigned' || status === 'accepted' ? order.pickupAddress : order.deliveryAddress;

  const handleDefaultPickup = async () => {
    haptic();
    setActionError(null);
    if (onPickup) {
      await onPickup();
      return;
    }
    updateStatus.mutate(
      {
        id: order.id,
        status: 'picked_up',
        driverUserId: driverUserId || order.driverUserId,
        driverName: driverDisplayName || order.driverName || 'Driver',
      },
      {
        onSuccess: () => {
          showToast('Order Picked Up', {
            type: 'info',
            description: `En route to ${order.customerName || 'customer'}`,
          });
        },
        onError: (err: any) => {
          setActionError(err?.message || 'Pickup update failed');
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

        {order.distanceMiles ? (
          <Text style={styles.phoneText}>{order.distanceMiles} mi</Text>
        ) : null}
      </View>

      <View style={styles.actionsContainer}>
        {!!order.customerPhone && (
          <TouchableOpacity
            onPress={() => {
              haptic();
              callPhone(order.customerPhone!);
            }}
            style={styles.iconButton}
          >
            <MaterialIcons name="phone" size={18} color="#dfe2ef" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            const isPickup = status === 'assigned' || status === 'accepted' || status === 'shopping';
            const lat = isPickup ? (order.pickupLat ?? order.pickup_lat) : ((order as any).deliveryLat ?? (order as any).delivery_lat);
            const lng = isPickup ? (order.pickupLng ?? order.pickup_lng) : ((order as any).deliveryLng ?? (order as any).delivery_lng);
            openMapsNavigation(navAddress ?? '', lat, lng);
          }}
          style={styles.mapButton}
        >
          <MaterialIcons name="near-me" size={18} color="#dfe2ef" />
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>

        {(status === 'assigned' || status === 'accepted') && (
          <TouchableOpacity
            onPress={handleDefaultPickup}
            disabled={updateStatus.isPending}
            style={styles.actionButton}
          >
            <MaterialIcons name="inventory" size={18} color="#f8f7ff" />
            <Text style={styles.actionButtonText}>
              {updateStatus.isPending ? '…' : 'Picked Up'}
            </Text>
          </TouchableOpacity>
        )}

        {(status === 'picked_up' || status === 'en_route' || status === 'shopping') && (
          <TouchableOpacity
            onPress={handleDefaultDeliver}
            disabled={updateStatus.isPending}
            style={[styles.actionButton, styles.deliverButton]}
          >
            <MaterialIcons name="check-circle" size={18} color="#f8f7ff" />
            <Text style={styles.actionButtonText}>Deliver</Text>
          </TouchableOpacity>
        )}

        {status === 'delivered' && (
          <View style={styles.deliveredBadgeButton}>
            <MaterialIcons name="check-circle" size={18} color="#00e297" />
            <Text style={styles.deliveredBadgeText}>Delivered</Text>
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

        {/* Pickup */}
        <View style={styles.routeItem}>
          <View style={[styles.routeIcon, { borderColor: '#FFE399' }]}>
            <MaterialIcons name="store" size={12} color="#FFE399" />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={[styles.routeLabel, { color: '#FFE399' }]}>PICKUP</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>
              {order.pickupAddress || 'Pickup address'}
            </Text>
          </View>
        </View>

        {/* Delivery */}
        <View style={styles.routeItem}>
          <View style={[styles.routeIcon, { borderColor: '#00E297' }]}>
            <MaterialIcons name="location-on" size={12} color="#00E297" />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={[styles.routeLabel, { color: '#00E297' }]}>DROPOFF</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>
              {order.deliveryAddress || 'Delivery address'}
            </Text>
          </View>
        </View>
      </View>

      {order.items ? (
        <View style={styles.itemsPill}>
          <MaterialIcons name="inventory-2" size={15} color="#B3C5FF" />
          <View style={styles.itemsTextCol}>
            <Text style={styles.itemsPillText} numberOfLines={2}>
              <Text style={styles.itemsHighlightTag}>ITEMS: </Text>
              {order.items}
            </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  userTextCol: {
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F131C',
    borderWidth: 1.5,
    borderColor: '#FFE399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFE399',
    fontSize: 13,
    fontWeight: '700',
  },
  userName: {
    color: '#dfe2ef',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  orderId: {
    color: 'rgba(194, 198, 216, 0.7)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  badgesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  routesContainer: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 4,
  },
  connectingLine: {
    position: 'absolute',
    left: 9,
    top: 20,
    bottom: 20,
    width: 1,
    backgroundColor: 'rgba(66, 70, 86, 0.3)',
  },
  routeItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    zIndex: 1,
  },
  routeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  routeAddress: {
    color: '#dfe2ef',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  itemsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 102, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.22)',
    marginTop: 10,
    overflow: 'hidden',
  },
  itemsTextCol: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  itemsPillText: {
    fontSize: 12,
    lineHeight: 16,
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
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceText: {
    color: '#00e297',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  tipText: {
    color: 'rgba(194, 198, 216, 0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  phoneText: {
    color: '#c2c6d8',
    fontSize: 11,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    borderRadius: 9999,
    backgroundColor: 'rgba(66, 70, 86, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(66, 70, 86, 0.4)',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: 'rgba(66, 70, 86, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(66, 70, 86, 0.4)',
  },
  mapButtonText: {
    color: '#dfe2ef',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 9999,
    backgroundColor: '#0066FF',
  },
  deliverButton: {
    backgroundColor: '#00E297',
  },
  actionButtonText: {
    color: '#f8f7ff',
    fontSize: 13,
    fontWeight: '700',
  },
  deliveredBadgeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
  },
  deliveredBadgeText: {
    color: '#00E297',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBox: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 92, 92, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 92, 0.3)',
  },
  errorText: {
    color: '#FF5C5C',
    fontSize: 11,
  },
});
