import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Navigation, CheckCircle } from '@blinkdotnew/mobile-ui';
import { MaterialIcons } from '@expo/vector-icons';
import { Order } from '@/lib/orders';
import { APP_CONFIG, calcDriverEarnings } from '@/lib/config';
import { haptic, openMapsNavigation, makePhoneCall, openSmsMessage } from './mapTypes';
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

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailCardHeader}>
        <View style={styles.userInfoCol}>
          <View style={styles.avatarCircleLarge}>
            <Text style={styles.avatarTextLarge}>
              {(selectedOrder.customerName || 'C').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.customerTitleCol}>
            <View style={styles.customerNameRow}>
              <Text style={styles.detailCustomerName}>{selectedOrder.customerName || 'Customer'}</Text>
              <View style={styles.liveTag}>
                <View style={styles.liveTagDot} />
                <Text style={styles.liveTagText}>LIVE</Text>
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
            {tipAmount > 0 ? `${(tipAmount / 100).toFixed(2)} tip` : '0.00 tip'}
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
          <View style={[styles.detailRouteIcon, { borderColor: '#b3c5ff' }]}>
            <MaterialIcons name="inventory-2" size={12} color="#b3c5ff" />
          </View>
          <View style={styles.detailRouteTextCol}>
            <Text style={[styles.detailRouteLabel, { color: '#b3c5ff' }]}>Pick up from</Text>
            <Text style={styles.detailRouteAddress} numberOfLines={2}>
              {selectedOrder.pickupAddress || APP_CONFIG.STORE_ADDRESS}
            </Text>
          </View>
        </View>

        <View style={styles.detailRouteItem}>
          <View style={[styles.detailRouteIcon, { borderColor: '#00e297' }]}>
            <MaterialIcons name="location-on" size={12} color="#00e297" />
          </View>
          <View style={styles.detailRouteTextCol}>
            <Text style={[styles.detailRouteLabel, { color: '#00e297' }]}>Deliver to</Text>
            <Text style={styles.detailRouteAddress} numberOfLines={2}>
              {selectedOrder.deliveryAddress}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => openMapsNavigation(selectedOrder.deliveryAddress)}
          style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.8 }]}
        >
          <Navigation size={15} color="#dfe2ef" />
          <Text style={styles.navButtonText}>Navigation</Text>
        </Pressable>

        {selectedOrder.status === 'pending' ? (
          <Pressable
            onPress={() => onAccept(selectedOrder)}
            style={({ pressed }) => [styles.acceptButton, pressed && { opacity: 0.85 }]}
          >
            <MaterialIcons name="local-shipping" size={18} color="#f8f7ff" />
            <Text style={styles.acceptButtonText}>ACCEPT ORDER</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => onOpenOrder(selectedOrder)}
            style={({ pressed }) => [styles.openOrderButton, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.openOrderButtonText}>OPEN ORDER</Text>
            <CheckCircle size={15} color="#000000" />
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    gap: 14,
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
    backgroundColor: '#31353f',
    borderWidth: 1,
    borderColor: '#424656',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    color: '#ffe399',
    fontSize: 16,
    fontWeight: '600',
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
    color: '#dfe2ef',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 102, 255, 0.15)',
    borderColor: 'rgba(0, 102, 255, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveTagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#0066FF',
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0066FF',
    letterSpacing: 0.5,
  },
  detailOrderId: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(194, 198, 216, 0.7)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
  },

  /* Earnings & Contact Row */
  earningsContactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  detailPriceText: {
    color: '#ffe399',
    fontSize: 24,
    fontWeight: '700',
  },
  detailTipText: {
    color: '#c2c6d8',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactMessageBtn: {
    backgroundColor: '#0066ff',
    borderColor: '#0066ff',
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
    backgroundColor: 'rgba(66, 70, 86, 0.4)',
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
    backgroundColor: '#0f131c',
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  detailRouteAddress: {
    color: '#dfe2ef',
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
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderRadius: 24,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dfe2ef',
  },
  openOrderButton: {
    flex: 1.5,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0066ff',
    borderRadius: 24,
    shadowColor: 'rgba(0, 102, 255, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  openOrderButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8f7ff',
    letterSpacing: 0.3,
  },
  acceptButton: {
    flex: 1.5,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0066ff',
    borderRadius: 24,
    shadowColor: 'rgba(0, 102, 255, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8f7ff',
    letterSpacing: 0.3,
  },
});
