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
import { useResponsive } from '@/hooks/useResponsive';

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
  const { select } = useResponsive();
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

    const reqId = !!(
      order.requiresIdVerification ||
      (order as any).requires_id_verification ||
      (order as any).hasAlcohol
    );
    const isVerified = !!(order.ageVerified || (order as any).age_verified);

    if (reqId && !isVerified) {
      showToast('Customer ID verification required for pickup', {
        type: 'warning',
      });
      router.push(`/order/${order.id}` as any);
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
    router.push(`/order/${order.id}` as any);
  };

  const requiresId = !!(
    order.requiresIdVerification ||
    (order as any).requires_id_verification ||
    (order as any).hasAlcohol
  );
  const isMedication =
    order.idVerificationType === 'medication' ||
    (order as any).id_verification_type === 'medication';
  const isIdVerified = !!(order.ageVerified || (order as any).age_verified);

  const parsedItems = (() => {
    let text = order.items || '';
    const idBadges: { label: string; icon?: any; color: string; bg: string; border: string }[] = [];
    let deliveryTag: { label: string; icon?: any; color: string; bg: string; border: string } | null = null;

    if (text.includes('[LEAVE AT DOOR]')) {
      deliveryTag = {
        label: 'Leave at Door',
        icon: 'meeting-room',
        color: '#FFE399',
        bg: 'rgba(255, 227, 153, 0.12)',
        border: 'rgba(255, 227, 153, 0.28)',
      };
      text = text.replace(/\[LEAVE AT DOOR\]\s*/g, '');
    } else if (text.includes('[MEET AT DOOR]')) {
      deliveryTag = {
        label: 'Meet at Door',
        icon: 'people',
        color: '#00E297',
        bg: 'rgba(0, 226, 151, 0.12)',
        border: 'rgba(0, 226, 151, 0.28)',
      };
      text = text.replace(/\[MEET AT DOOR\]\s*/g, '');
    }

    if (requiresId || text.includes('[21+ ALCOHOL ID REQUIRED]') || text.includes('[21+ALCOHOL ID REQUIRED]')) {
      idBadges.push({
        label: isMedication ? 'RX ID' : '21+ ID',
        icon: isMedication ? 'medical-services' : 'wine-bar',
        color: isMedication ? '#B388FF' : '#FF7B7B',
        bg: isMedication ? 'rgba(179, 136, 255, 0.14)' : 'rgba(255, 107, 107, 0.14)',
        border: isMedication ? 'rgba(179, 136, 255, 0.35)' : 'rgba(255, 107, 107, 0.35)',
      });
      text = text.replace(/\[21\+?\s*ALCOHOL ID REQUIRED\]\s*/gi, '');
    }

    if (isIdVerified) {
      idBadges.push({
        label: 'ID Verified',
        icon: 'verified',
        color: '#00E297',
        bg: 'rgba(0, 226, 151, 0.14)',
        border: 'rgba(0, 226, 151, 0.35)',
      });
    }

    const otherBracket = text.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (otherBracket) {
      idBadges.push({
        label: otherBracket[1],
        color: '#B3C5FF',
        bg: 'rgba(0, 102, 255, 0.12)',
        border: 'rgba(0, 102, 255, 0.28)',
      });
      text = otherBracket[2] || '';
    }

    return {
      cleanText: text.trim() || order.items || 'Standard Order',
      idBadges,
      deliveryTag,
    };
  })();

  const headerNode = (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userTextCol}>
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
            {order.customerName || 'Customer'}
          </Text>
          <Text style={styles.orderId} numberOfLines={1} ellipsizeMode="tail">
            #{shortId} · {order.pickupAddress ? order.pickupAddress.split(',')[0] : 'Order'}
          </Text>
        </View>
      </View>

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
  );

  const footerNode = (
    <View style={styles.footer}>
      <View style={styles.footerTop}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>${earnings.totalDisplay}</Text>
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
          <MaterialIcons name="warning" size={14} color="#FF5C5C" />
          <Text style={styles.errorText}>{actionError}</Text>
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
      style={[
        styles.cardContainer,
        { marginHorizontal: select(16, 12, 8) },
        style,
      ]}
    >
      {order.items ? (
        <View style={styles.itemsCard}>
          <View style={styles.itemsHeaderRow}>
            <View style={styles.itemsTitleLeft}>
              <View style={styles.itemsIconBox}>
                <MaterialIcons name="inventory-2" size={13} color="#FFE399" />
              </View>
              <Text style={styles.itemsSectionTitle}>ORDER ITEMS</Text>
            </View>

            {parsedItems.deliveryTag && (
              <View
                style={[
                  styles.deliveryInstructionPill,
                  {
                    backgroundColor: parsedItems.deliveryTag.bg,
                    borderColor: parsedItems.deliveryTag.border,
                  },
                ]}
              >
                <MaterialIcons
                  name={parsedItems.deliveryTag.icon}
                  size={11}
                  color={parsedItems.deliveryTag.color}
                />
                <Text
                  style={[
                    styles.deliveryInstructionText,
                    { color: parsedItems.deliveryTag.color },
                  ]}
                >
                  {parsedItems.deliveryTag.label}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.itemsContentRow}>
            <Text style={styles.itemsBodyText} numberOfLines={2}>
              {parsedItems.cleanText}
            </Text>

            {parsedItems.idBadges.length > 0 && (
              <View style={styles.idBadgesRow}>
                {parsedItems.idBadges.map((b, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.itemTagPill,
                      { backgroundColor: b.bg, borderColor: b.border },
                    ]}
                  >
                    {b.icon && <MaterialIcons name={b.icon} size={11} color={b.color} />}
                    <Text style={[styles.itemTagText, { color: b.color }]}>{b.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      ) : null}

      <View style={styles.routesContainer}>
        <View style={styles.routeItem}>
          <View style={styles.routeIconBoxPickup}>
            <MaterialIcons name="store" size={15} color="#FFE399" />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={styles.routeLabelPickup}>PICK UP FROM</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>
              {order.pickupAddress || 'Pickup address'}
            </Text>
          </View>
        </View>

        <View style={styles.routeLineContainer}>
          <View style={styles.connectingLine} />
        </View>

        <View style={styles.routeItem}>
          <View style={styles.routeIconBoxDelivery}>
            <MaterialIcons name="navigation" size={15} color="#00E297" />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={styles.routeLabelDelivery}>DELIVER TO</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>
              {order.deliveryAddress || 'Delivery address'}
            </Text>
          </View>
        </View>
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  userTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
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
    letterSpacing: 0.3,
    marginTop: 1,
  },
  badgesWrapper: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 4,
    flexShrink: 0,
    maxWidth: '52%',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badgeWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  alcoholBadge: {
    backgroundColor: 'rgba(255, 92, 92, 0.12)',
    borderColor: 'rgba(255, 92, 92, 0.35)',
  },
  alcoholBadgeText: {
    color: '#FF7B7B',
    fontWeight: '700',
  },
  rxBadge: {
    backgroundColor: 'rgba(179, 136, 255, 0.12)',
    borderColor: 'rgba(179, 136, 255, 0.35)',
  },
  rxBadgeText: {
    color: '#B388FF',
    fontWeight: '700',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: 'rgba(0, 226, 151, 0.35)',
  },
  verifiedBadgeText: {
    color: '#00E297',
    fontWeight: '700',
  },
  itemsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemsTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  itemsIconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFE399',
    letterSpacing: 0.8,
  },
  idBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flexShrink: 1,
  },
  itemTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  itemTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  itemsContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemsBodyText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deliveryInstructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: 'center',
  },
  deliveryInstructionText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  routesContainer: {
    flexDirection: 'column',
    gap: 4,
    marginTop: 8,
    marginBottom: 2,
  },
  routeItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  routeIconBoxPickup: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  routeIconBoxDelivery: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  routeLineContainer: {
    width: 28,
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
  },
  connectingLine: {
    width: 1.5,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 1,
  },
  routeTextContainer: {
    flex: 1,
    gap: 3,
  },
  routeLabelPickup: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFE399',
    letterSpacing: 0.8,
  },
  routeLabelDelivery: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E297',
    letterSpacing: 0.8,
  },
  routeAddress: {
    color: '#E0E3EF',
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
