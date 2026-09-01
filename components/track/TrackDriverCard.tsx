import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
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
  const initial = (driverName || 'D').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeaderLabel}>ASSIGNED DRIVER</Text>
      <View style={styles.driverRow}>
        {driverPhoto && driverPhoto.startsWith('http') ? (
          <Image
            source={{ uri: driverPhoto }}
            style={styles.driverAvatarImg}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.driverAvatarFallback}>
            <Text style={styles.driverInitialText}>{initial}</Text>
          </View>
        )}

        <View style={styles.driverInfoCol}>
          <Text style={styles.driverName}>{driverName}</Text>
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
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 226, 151, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitialText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00E297',
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
