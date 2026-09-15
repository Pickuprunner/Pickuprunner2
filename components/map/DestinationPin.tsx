import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Order } from '@/lib/orders';
import { colors } from '@/constants/design';
import { COBALT, GOLD } from './mapTypes';

export function DestinationPin({
  isActive,
  stopNumber,
  isSelected,
}: {
  order?: Order;
  isActive: boolean;
  stopNumber: number | null;
  isSelected: boolean;
  isZoomedIn?: boolean;
  isTargetRoute?: boolean;
}) {
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
    </View>
  );
}

const styles = StyleSheet.create({
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    minHeight: 28,
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
});
