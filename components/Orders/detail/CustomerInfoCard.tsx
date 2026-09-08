import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomCard } from '@/components/core';
import { colors } from '@/constants/design';
import type { Order } from '@/lib/orders';

export interface CustomerInfoCardProps {
  order?: Order | null;
}

function formatDisplayPhone(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    const d = digits.slice(1);
    return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return phone;
}

function parseOrderItemsData(rawItems?: string | null) {
  if (!rawItems || rawItems === 'N/A') {
    return { cleanItems: '', pickupInfo: '', isMeet: false, hasAlcohol: false };
  }

  const isMeet = /\[MEET\s*(AT\s*DOOR|CUSTOMER)\]/i.test(rawItems);
  const hasAlcohol = /\[21\+\s*ALCOHOL/i.test(rawItems);

  
  let cleaned = rawItems.replace(/\[.*?\]/g, '').trim();

 
  let pickupInfo = '';
  const orderMatch = cleaned.match(/^(?:Order|Pickup|Order\s*#|#)\s*:?\s*([A-Za-z0-9#-]+)\s*(?:·|•|-)\s*/i);
  if (orderMatch) {
    pickupInfo = orderMatch[1].trim();
    cleaned = cleaned.replace(orderMatch[0], '').trim();
  }

  
  cleaned = cleaned.replace(/^[·•\-\s]+|[·•\-\s]+$/g, '').trim();

  return {
    cleanItems: cleaned || rawItems.replace(/\[.*?\]/g, '').trim(),
    pickupInfo,
    isMeet,
    hasAlcohol,
  };
}

function InfoRow({
  label,
  value,
  accent,
  onPress,
  icon,
  badge,
  isLast = false,
}: {
  label: string;
  value?: string | null;
  accent?: string;
  onPress?: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  badge?: React.ReactNode;
  isLast?: boolean;
}) {
  if (!value && !badge) return null;
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.infoRow, isLast && styles.infoRowLast]}
    >
      <View style={styles.infoLeft}>
        <View style={styles.iconBox}>
          {icon && <MaterialIcons name={icon} size={15} color={colors.outline} />}
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={styles.infoRight}>
        {badge ? (
          badge
        ) : (
          <Text
            style={[styles.infoValue, accent ? { color: accent } : undefined]}
            numberOfLines={2}
          >
            {value}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function CustomerInfoCard({ order }: CustomerInfoCardProps) {
  const { cleanItems, pickupInfo, isMeet } = parseOrderItemsData(order?.items);
  const deliveryPref = isMeet ? 'Meet at Door' : 'Leave at Door';
  const isGreen = !isMeet;

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
        value={formatDisplayPhone(order?.customerPhone)}
        accent={colors.primary}
        onPress={() =>
          order?.customerPhone ? Linking.openURL(`tel:${order.customerPhone}`) : undefined
        }
      />

      {!!pickupInfo && (
        <InfoRow
          icon="receipt-long"
          label="Pickup / Order"
          value={pickupInfo.replace(/^#/, '')}
          accent="#DFE2EF"
        />
      )}

      {!!cleanItems && cleanItems !== 'N/A' && (
        <InfoRow
          icon="shopping-bag"
          label="Items"
          value={cleanItems}
        />
      )}

      <InfoRow
        icon="meeting-room"
        label="Delivery Preference"
        isLast
        badge={
          <View
            style={[
              styles.prefPill,
              isGreen ? styles.prefPillGreen : styles.prefPillGold,
            ]}
          >
            <Text
              style={[
                styles.prefPillText,
                isGreen ? styles.prefTextGreen : styles.prefTextGold,
              ]}
            >
              {deliveryPref}
            </Text>
          </View>
        }
      />
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  customerCard: {
    marginHorizontal: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '500',
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    maxWidth: '62%',
  },
  infoValue: {
    color: colors.onSurface,
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'right',
  },
  prefPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  prefPillGreen: {
    backgroundColor: 'rgba(0, 226, 151, 0.1)',
    borderColor: 'rgba(0, 226, 151, 0.25)',
  },
  prefPillGold: {
    backgroundColor: 'rgba(255, 227, 153, 0.1)',
    borderColor: 'rgba(255, 227, 153, 0.25)',
  },
  prefPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  prefTextGreen: {
    color: colors.tertiary,
  },
  prefTextGold: {
    color: colors.secondary,
  },
});



