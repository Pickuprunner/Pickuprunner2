import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomCard } from '@/components/core';
import { colors } from '@/constants/design';
import type { Order } from '@/lib/orders';

export interface CustomerInfoCardProps {
  order?: Order | null;
}

function InfoRow({
  label,
  value,
  accent,
  onPress,
  icon,
  actionIcon,
}: {
  label: string;
  value?: string | null;
  accent?: string;
  onPress?: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  actionIcon?: keyof typeof MaterialIcons.glyphMap;
}) {
  if (!value) return null;
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={styles.infoRow}
    >
      <View style={styles.infoLeft}>
        {icon && <MaterialIcons name={icon} size={16} color={colors.outline} />}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={styles.infoRight}>
        <Text
          style={[styles.infoValue, accent ? { color: accent } : undefined]}
          numberOfLines={2}
        >
          {value}
        </Text>
        {onPress && (
          <MaterialIcons
            name={actionIcon ?? 'chevron-right'}
            size={18}
            color={accent ?? colors.outline}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

export function CustomerInfoCard({ order }: CustomerInfoCardProps) {
  const isMeetCustomer = !!order?.items?.includes('[MEET CUSTOMER]');

  return (
    <CustomCard variant="glass" style={styles.customerCard}>
      <InfoRow
        icon="person"
        label="Name"
        value={order?.customerName}
      />
      <InfoRow
        icon="phone"
        label="Phone"
        value={order?.customerPhone}
        accent={colors.primary}
        actionIcon="phone"
        onPress={() =>
          order?.customerPhone ? Linking.openURL(`tel:${order.customerPhone}`) : undefined
        }
      />
      {!!order?.items && order.items !== 'N/A' && (
        <InfoRow
          icon="shopping-bag"
          label="Items"
          value={order.items}
        />
      )}
      <InfoRow
        icon="meeting-room"
        label="Delivery Preference"
        value={isMeetCustomer ? 'Meet at Door' : 'Leave at Door'}
        accent={isMeetCustomer ? colors.secondary : colors.tertiary}
      />
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  customerCard: {
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassLevel2Border,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '500',
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '65%',
  },
  infoValue: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
});
