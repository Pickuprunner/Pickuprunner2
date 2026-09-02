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
import { Order, useClaimOrder } from '@/lib/orders';
import { calcDriverEarnings } from '@/lib/config';
import * as Haptics from 'expo-haptics';
import { CustomCard, useToast } from '@/components/core';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

import { openMapsNavigation } from '@/lib/maps';


export interface DriverOrderCardProps {
  order: Order;
  onPress?: () => void;
  driverAtCapacity?: boolean;
  driverUserId?: string;
  driverDisplayName?: string;
  onAccept?: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
}

export function DriverOrderCard({
  order,
  onPress,
  driverAtCapacity = false,
  driverUserId,
  driverDisplayName,
  onAccept,
  style,
}: DriverOrderCardProps) {
  const { showToast } = useToast();
  const claimOrder = useClaimOrder();
  const shortId = order.id ? order.id.slice(-6).toUpperCase() : '------';

  const miles = Number(order.distanceMiles ?? 0);
  const tipAmount = Number(order.tipAmount ?? 0);
  const earnings = calcDriverEarnings(miles, tipAmount);
  const [actionError, setActionError] = useState<string | null>(null);

  const initial = (order.customerName?.trim() || 'C').charAt(0).toUpperCase();
  const navAddress = order.pickupAddress || order.deliveryAddress || '';

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
      await claimOrder.mutateAsync({
        orderId: order.id,
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
        <View style={[styles.statusBadge, styles.availableBadge]}>
          <Text style={[styles.statusText, styles.availableBadgeText]}>
            AVAILABLE
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
              ? `${(earnings.tipCents / 100).toFixed(2)} tip included`
              : '0.00 tip included'}
          </Text>
        </View>

        {order.distanceMiles ? (
          <Text style={styles.phoneText}>{order.distanceMiles} mi</Text>
        ) : null}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={() => {
            const lat = order.pickupLat ?? (order as any).pickup_lat;
            const lng = order.pickupLng ?? (order as any).pickup_lng;
            openMapsNavigation(navAddress, lat, lng);
          }}
          style={styles.mapButton}
        >
          <MaterialIcons name="near-me" size={18} color="#dfe2ef" />
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDefaultAccept}
          disabled={claimOrder.isPending || driverAtCapacity}
          style={[
            styles.actionButton,
            driverAtCapacity && styles.actionButtonDisabled,
          ]}
        >
          <MaterialIcons
            name="local-shipping"
            size={18}
            color={driverAtCapacity ? 'rgba(248, 247, 255, 0.4)' : '#f8f7ff'}
          />
          <Text
            style={[
              styles.actionButtonText,
              driverAtCapacity && styles.actionButtonTextDisabled,
            ]}
          >
            {claimOrder.isPending
              ? 'Accepting…'
              : driverAtCapacity
              ? 'Queue Full'
              : 'Accept'}
          </Text>
        </TouchableOpacity>
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
  availableBadge: {
    backgroundColor: 'rgba(244, 195, 0, 0.1)',
    borderColor: 'rgba(244, 195, 0, 0.3)',
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  availableBadgeText: {
    color: '#F4C300',
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
  actionButtonDisabled: {
    backgroundColor: 'rgba(66, 70, 86, 0.2)',
  },
  actionButtonText: {
    color: '#f8f7ff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonTextDisabled: {
    color: 'rgba(248, 247, 255, 0.4)',
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
