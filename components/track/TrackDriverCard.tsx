import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/constants/design';

export interface TrackDriverCardProps {
  driverName: string;
  driverPhoto?: string | null;
  driverPhone?: string | null;
  isPickedUp: boolean;
}

export function TrackDriverCard({
  driverName,
  driverPhoto,
  driverPhone,
  isPickedUp,
}: TrackDriverCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeaderLabel}>ASSIGNED DRIVER</Text>
      <View style={styles.driverRow}>
        {driverPhoto ? (
          <Image source={{ uri: driverPhoto }} style={styles.driverAvatarImg} />
        ) : (
          <View style={styles.driverAvatarFallback}>
            <MaterialIcons name="person" size={24} color={colors.secondary} />
          </View>
        )}

        <View style={styles.driverInfoCol}>
          <View style={styles.driverNameRow}>
            <Text style={styles.driverName}>{driverName}</Text>
            <View style={styles.ratingBadge}>
              <MaterialIcons name="star" size={12} color={colors.secondary} />
              <Text style={styles.ratingText}>4.9</Text>
            </View>
          </View>
          <Text style={styles.driverRole}>
            {isPickedUp ? 'Package picked up · En route to you' : 'Driver en route to store'}
          </Text>
        </View>

        {driverPhone ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${driverPhone}`)}
          >
            <MaterialIcons name="phone" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.enRoutePill}>
            <Text style={styles.enRoutePillText}>EN ROUTE</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    backgroundColor: colors.glassLevel2Bg,
    padding: 20,
    gap: 14,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.outline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  driverAvatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
  },
  driverAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accentAlpha15,
    borderWidth: 1,
    borderColor: colors.accentAlpha30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfoCol: {
    flex: 1,
    gap: 4,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.onSurface,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accentAlpha15,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  driverRole: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
  },
  callBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryAlpha15,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enRoutePill: {
    backgroundColor: colors.primaryAlpha15,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  enRoutePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
});
