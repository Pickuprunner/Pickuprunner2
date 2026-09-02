import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Navigation, CheckCircle } from '@blinkdotnew/mobile-ui';
import { MaterialIcons } from '@expo/vector-icons';
import { Order } from '@/lib/orders';
import { APP_CONFIG, calcDriverEarnings } from '@/lib/config';
import { colors, shadows, borderRadius } from '@/constants/design';
import { haptic, openMapsNavigation, makePhoneCall, openSmsMessage, GOLD, COBALT } from './mapTypes';
import { PhoneIcon, MessageIcon } from '@/assets/icons/MapIcons';
import { DeliveryTimeline } from './DeliveryTimeline';

export function MapSelectedCard({
  selectedOrder,
  onClose,
  onAccept,
  onOpenOrder,
}: {
  selectedOrder: Order;
  onClose: () => void;
  onAccept: (order: Order) => void;
  onOpenOrder: (order: Order) => void;
}) {
  const miles = Number(selectedOrder.distanceMiles ?? 0);
  const tipAmount = Number(selectedOrder.tipAmount ?? 0);
  const earnings = calcDriverEarnings(miles, tipAmount);
  const isPending = selectedOrder.status === 'pending';

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailCardHeader}>
        <View style={styles.userInfoCol}>
          <View
            style={[
              styles.avatarCircleLarge,
              !isPending && { borderColor: colors.primary, backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <Text style={[styles.avatarTextLarge, !isPending && { color: colors.primary }]}>
              {(selectedOrder.customerName || 'C').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.customerTitleCol}>
            <View style={styles.customerNameRow}>
              <Text style={styles.detailCustomerName}>{selectedOrder.customerName || 'Customer'}</Text>
              <View style={[styles.liveTag, !isPending && styles.activeTag]}>
                <View style={[styles.liveTagDot, !isPending && { backgroundColor: colors.primary }]} />
                <Text style={[styles.liveTagText, !isPending && { color: colors.primary }]}>
                  {isPending ? 'AVAILABLE' : 'ACTIVE'}
                </Text>
              </View>
            </View>
            <Text style={styles.detailOrderId}>
              #{selectedOrder.id ? selectedOrder.id.slice(-6).toUpperCase() : '------'}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            haptic('light');
            onClose();
          }}
          style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.earningsContactRow}>
        <View style={styles.priceContainer}>
          <Text style={styles.detailPriceText}>${earnings.totalDisplay}</Text>
          <Text style={styles.detailTipText}>
            {tipAmount > 0 ? `+$${(tipAmount / 100).toFixed(2)} tip` : 'incl. tip'}
          </Text>
        </View>

        <View style={styles.contactActionButtons}>
          <Pressable
            onPress={() => makePhoneCall(selectedOrder.customerPhone)}
            style={({ pressed }) => [styles.contactIconBtn, pressed && { opacity: 0.7 }]}
          >
            <PhoneIcon size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => openSmsMessage(selectedOrder.customerPhone)}
            style={({ pressed }) => [styles.contactIconBtn, styles.contactMessageBtn, pressed && { opacity: 0.7 }]}
          >
            <MessageIcon size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.detailRoutesContainer}>
        <View style={styles.detailConnectingLine} />

        <View style={styles.detailRouteItem}>
          <View style={[styles.detailRouteIcon, { borderColor: colors.primary }]}>
            <MaterialIcons name="inventory-2" size={12} color={colors.primary} />
          </View>
          <View style={styles.detailRouteTextCol}>
            <Text style={[styles.detailRouteLabel, { color: colors.primary }]}>Pick up from</Text>
            <Text style={styles.detailRouteAddress} numberOfLines={2}>
              {selectedOrder.pickupAddress || APP_CONFIG.STORE_ADDRESS}
            </Text>
          </View>
        </View>

        <View style={styles.detailRouteItem}>
          <View style={[styles.detailRouteIcon, { borderColor: colors.tertiary }]}>
            <MaterialIcons name="location-on" size={12} color={colors.tertiary} />
          </View>
          <View style={styles.detailRouteTextCol}>
            <Text style={[styles.detailRouteLabel, { color: colors.tertiary }]}>Deliver to</Text>
            <Text style={styles.detailRouteAddress} numberOfLines={2}>
              {selectedOrder.deliveryAddress}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() =>
            openMapsNavigation(
              selectedOrder.deliveryAddress,
              (selectedOrder as any).deliveryLat ?? (selectedOrder as any).delivery_lat,
              (selectedOrder as any).deliveryLng ?? (selectedOrder as any).delivery_lng
            )
          }
          style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.8 }]}
        >
          <Navigation size={15} color={colors.onSurface} />
          <Text style={styles.navButtonText}>Navigation</Text>
        </Pressable>

        {isPending ? (
          <Pressable
            onPress={() => onAccept(selectedOrder)}
            style={({ pressed }) => [styles.acceptButton, pressed && { opacity: 0.85 }]}
          >
            <MaterialIcons name="local-shipping" size={18} color="#FFFFFF" />
            <Text style={styles.acceptButtonText}>ACCEPT ORDER</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => onOpenOrder(selectedOrder)}
            style={({ pressed }) => [styles.openOrderButton, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.openOrderButtonText}>OPEN ORDER</Text>
            <CheckCircle size={15} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
      <DeliveryTimeline status={selectedOrder.status} />
    </View>
  );
}

const styles = StyleSheet.create({
  detailCard: {
    marginHorizontal: 16,
    alignSelf: 'stretch',
    backgroundColor: colors.glassLevel2Bg,
    borderColor: colors.glassLevel2Border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 18,
    gap: 14,
    ...shadows.lg,
  },
  detailCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircleLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  customerTitleCol: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailCustomerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentAlpha15,
    borderColor: colors.accentAlpha40,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  activeTag: {
    backgroundColor: colors.primaryAlpha15,
    borderColor: colors.primaryAlpha40,
  },
  liveTagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 0.5,
  },
  detailOrderId: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glassLevel3Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel3Border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },

  /* Earnings & Contact Row */
  earningsContactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassLevel2Border,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  detailPriceText: {
    color: colors.secondary,
    fontSize: 24,
    fontWeight: '700',
  },
  detailTipText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  contactActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  contactIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.glassLevel2Border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactMessageBtn: {
    backgroundColor: COBALT,
    borderColor: COBALT,
    ...shadows.cobaltGlow,
  },
  detailRoutesContainer: {
    flexDirection: 'column',
    gap: 12,
    position: 'relative',
  },
  detailConnectingLine: {
    position: 'absolute',
    left: 9,
    top: 18,
    bottom: 18,
    width: 1,
    backgroundColor: colors.outlineVariant,
  },
  detailRouteItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    zIndex: 1,
  },
  detailRouteIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  detailRouteTextCol: {
    flex: 1,
  },
  detailRouteLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  detailRouteAddress: {
    color: colors.onSurface,
    fontSize: 14,
    lineHeight: 19,
  },

  /* Action Buttons */
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navButton: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.glassLevel2Border,
    borderWidth: 1,
    borderRadius: borderRadius.full,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  openOrderButton: {
    flex: 1.5,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COBALT,
    borderRadius: borderRadius.full,
    ...shadows.cobaltGlow,
  },
  openOrderButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  acceptButton: {
    flex: 1.5,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COBALT,
    borderRadius: borderRadius.full,
    ...shadows.cobaltGlow,
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

