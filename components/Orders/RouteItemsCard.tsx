import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomInput } from '@/components/core';
import { APP_CONFIG } from '@/lib/config';
import { colors, spacing, typography } from '@/constants/design';

interface RouteItemsCardProps {
  pickupAddress: string;
  onPickupAddressChange: (val: string) => void;
  deliveryAddress: string;
  onDeliveryAddressChange: (val: string) => void;
  items: string;
  onItemsChange: (val: string) => void;
}

export function RouteItemsCard({
  pickupAddress,
  onPickupAddressChange,
  deliveryAddress,
  onDeliveryAddressChange,
  items,
  onItemsChange,
}: RouteItemsCardProps) {
  const isPickupLocked = APP_CONFIG.LOCK_PICKUP_ADDRESS;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>ROUTE & ITEMS</Text>

      <View style={styles.content}>
        <CustomInput
          label={isPickupLocked ? 'PICKUP ADDRESS (STORE DEFAULT)' : 'PICKUP ADDRESS'}
          placeholder="Where to pick up"
          value={pickupAddress}
          onChangeText={isPickupLocked ? undefined : onPickupAddressChange}
          editable={!isPickupLocked}
          autoCapitalize="words"
          leftIcon={<MaterialIcons name="place" size={18} color={colors.secondaryContainer} />}
          rightIcon={
            isPickupLocked ? (
              <MaterialIcons name="lock-outline" size={16} color={colors.outline} />
            ) : undefined
          }
        />

        <CustomInput
          label="DELIVERY ADDRESS *"
          placeholder="Where to drop off"
          value={deliveryAddress}
          onChangeText={onDeliveryAddressChange}
          autoCapitalize="words"
          leftIcon={<MaterialIcons name="navigation" size={18} color={colors.primaryContainer} />}
        />

        <CustomInput
          label="ORDER ITEMS *"
          placeholder="e.g. 2 grocery bags, electronics, clothing..."
          value={items}
          onChangeText={onItemsChange}
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
          leftIcon={<MaterialIcons name="inventory-2" size={18} color={colors.outline} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelMd,
    color: colors.outline,
    marginBottom: spacing.md,
    marginLeft: 2,
  },
  content: {
    gap: spacing.md,
  },
});
