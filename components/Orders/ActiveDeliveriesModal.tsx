import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Order, useUpdateOrderStatus } from '@/lib/orders';
import { setSelectedOrder } from '@/lib/selectedOrder';
import { calcDriverEarnings } from '@/lib/config';
import { colors } from '@/constants/design';

interface Props {
  visible: boolean;
  onClose: () => void;
  orders: Order[];
}

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

function openNav(address: string) {
  if (!address) return;
  const encoded = encodeURIComponent(address);
  const url = Platform.OS === 'ios'
    ? `maps://?daddr=${encoded}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  Linking.openURL(url);
}

export function ActiveDeliveriesModal({ visible, onClose, orders }: Props) {
  const updateStatus = useUpdateOrderStatus();

  const handleNextStatus = async (order: Order) => {
    haptic();
    if (order.status === 'accepted') {
      await updateStatus.mutateAsync({ id: order.id, status: 'picked_up' });
    } else if (order.status === 'picked_up') {
      setSelectedOrder(order);
      onClose();
      router.push(`/order/${order.id}`);
    }
  };

  const handleViewDetails = (order: Order) => {
    haptic();
    setSelectedOrder(order);
    onClose();
    router.push(`/order/${order.id}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop Tap to Close */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Sheet Content */}
        <View style={styles.sheetContainer}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.sheetTitle}>Active Deliveries</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{orders.length}</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                haptic();
                onClose();
              }}
              accessibilityLabel="Close modal"
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
              ]}
            >
              <MaterialIcons name="close" size={20} color={colors.onSurface} />
            </Pressable>
          </View>

          <Text style={styles.sheetSubtitle}>
            Orders currently assigned to you. Tap action to update status.
          </Text>

          {/* Order Cards List */}
          <ScrollView
            style={styles.ordersScroll}
            contentContainerStyle={styles.ordersList}
            showsVerticalScrollIndicator={false}
          >
            {orders.map((order) => {
              const miles = Number(order.distanceMiles ?? 0);
              const tip = Number(order.tipAmount ?? 0);
              const earnings = calcDriverEarnings(miles, tip);
              const isAccepted = order.status === 'accepted';
              const isPickedUp = order.status === 'picked_up';

              return (
                <View key={order.id} style={styles.orderCard}>
                  {/* Card Top: Customer Name + Earnings */}
                  <View style={styles.orderTopRow}>
                    <View style={styles.customerCol}>
                      <Text style={styles.customerName}>{order.customerName || 'Customer'}</Text>
                      {order.customerPhone ? (
                        <Pressable
                          onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
                          style={styles.phoneRow}
                        >
                          <MaterialIcons name="phone" size={13} color={colors.onSurfaceVariant} />
                          <Text style={styles.phoneText}>{order.customerPhone}</Text>
                        </Pressable>
                      ) : null}
                    </View>

                    <View style={styles.earningsPill}>
                      <Text style={styles.earningsText}>{earnings.totalDisplay}</Text>
                    </View>
                  </View>

                  {/* Route Steps */}
                  <View style={styles.routeBox}>
                    {/* Pickup */}
                    <View style={styles.routeStep}>
                      <View style={styles.stepDotPickup}>
                        <MaterialIcons name="inventory-2" size={12} color={colors.secondary} />
                      </View>
                      <View style={styles.stepTextCol}>
                        <Text style={styles.stepLabel}>PICKUP</Text>
                        <Text style={styles.stepAddress} numberOfLines={1}>
                          {order.pickupAddress || 'Store Pickup'}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => openNav(order.pickupAddress)}
                        style={styles.navBtn}
                      >
                        <MaterialIcons name="near-me" size={16} color={colors.primary} />
                      </Pressable>
                    </View>

                    <View style={styles.connectorLine} />

                    {/* Delivery */}
                    <View style={styles.routeStep}>
                      <View style={styles.stepDotDrop}>
                        <MaterialIcons name="location-on" size={14} color={colors.primary} />
                      </View>
                      <View style={styles.stepTextCol}>
                        <Text style={styles.stepLabel}>DROPOFF</Text>
                        <Text style={styles.stepAddress} numberOfLines={1}>
                          {order.deliveryAddress || 'Customer Address'}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => openNav(order.deliveryAddress)}
                        style={styles.navBtn}
                      >
                        <MaterialIcons name="near-me" size={16} color={colors.primary} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.cardActionsRow}>
                    <Pressable
                      onPress={() => handleViewDetails(order)}
                      style={styles.detailsBtn}
                    >
                      <Text style={styles.detailsBtnText}>Details</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleNextStatus(order)}
                      disabled={updateStatus.isPending}
                      style={({ pressed }) => [
                        styles.statusActionBtn,
                        isPickedUp && styles.statusActionComplete,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      {updateStatus.isPending ? (
                        <ActivityIndicator size="small" color="#0F131C" />
                      ) : (
                        <>
                          <MaterialIcons
                            name={isAccepted ? 'local-shipping' : 'check-circle'}
                            size={16}
                            color="#0F131C"
                          />
                          <Text style={styles.statusActionText}>
                            {isAccepted ? 'Confirm Pickup' : 'Complete Delivery'}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#161B26',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DFE2EF',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 227, 153, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.3)',
  },
  countBadgeText: {
    color: '#FFE399',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#C2C6D8',
    marginBottom: 16,
  },
  ordersScroll: {
    flexGrow: 0,
  },
  ordersList: {
    gap: 14,
    paddingBottom: 8,
  },
  orderCard: {
    backgroundColor: '#0F131C',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerCol: {
    flex: 1,
  },
  customerName: {
    color: '#DFE2EF',
    fontSize: 15,
    fontWeight: '700',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  phoneText: {
    color: '#C2C6D8',
    fontSize: 12,
  },
  earningsPill: {
    backgroundColor: 'rgba(244, 195, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  earningsText: {
    color: '#FFE399',
    fontWeight: '700',
    fontSize: 14,
  },
  routeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  routeStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDotPickup: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(244, 195, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDrop: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 102, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextCol: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 0.5,
  },
  stepAddress: {
    fontSize: 12,
    color: '#DFE2EF',
    marginTop: 1,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLine: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginLeft: 11,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: {
    color: '#DFE2EF',
    fontSize: 13,
    fontWeight: '600',
  },
  statusActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFE399',
  },
  statusActionComplete: {
    backgroundColor: '#00E297',
  },
  statusActionText: {
    color: '#0F131C',
    fontSize: 13,
    fontWeight: '700',
  },
});
