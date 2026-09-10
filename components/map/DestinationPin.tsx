import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Order } from '@/lib/orders';
import { colors, borderRadius } from '@/constants/design';
import { COBALT, GOLD } from './mapTypes';
import { getStreetOnly } from './mapApproachUtils';

export function DestinationPin({
  order,
  isActive,
  stopNumber,
  isSelected,
  isZoomedIn,
  isTargetRoute,
}: {
  order: Order;
  isActive: boolean;
  stopNumber: number | null;
  isSelected: boolean;
  isZoomedIn: boolean;
  isTargetRoute: boolean;
}) {
  const showStreetLabel = isZoomedIn && (isSelected || isTargetRoute);
  const streetText = getStreetOnly(order.deliveryAddress);

  return (
    <View style={styles.pinWrapper}>
      {isActive ? (
        <View style={[styles.activeDeliveryPin, isSelected && styles.activeDeliveryPinSelected]}>
          <Text style={styles.activeDeliveryStopNumber}>{stopNumber ?? 1}</Text>
        </View>
      ) : (
        <View style={[styles.deliveryPinContainer, isSelected && styles.deliveryPinSelectedPending]}>
          <MaterialIcons name="location-on" size={15} color={GOLD} />
        </View>
      )}

      {showStreetLabel && Boolean(streetText) && (
        <View style={[styles.streetAddressPill, isSelected && styles.streetAddressPillSelected]}>
          <Text style={styles.streetAddressText} numberOfLines={1}>
            {streetText}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pinWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDeliveryPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COBALT,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  activeDeliveryPinSelected: {
    borderColor: '#FFFFFF',
    borderWidth: 2.5,
    transform: [{ scale: 1.15 }],
    shadowColor: COBALT,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  activeDeliveryStopNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  deliveryPinContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: GOLD,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  deliveryPinSelectedPending: {
    borderColor: GOLD,
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
  },
  streetAddressPill: {
    backgroundColor: 'rgba(15, 19, 28, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  streetAddressPillSelected: {
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderWidth: 1.5,
  },
  streetAddressText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
