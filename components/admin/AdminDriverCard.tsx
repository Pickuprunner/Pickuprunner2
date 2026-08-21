import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '@/constants/design';

export interface AdminDriverSummary {
  uid: string;
  name: string;
  email?: string;
  docStatus?: string;
  bgStatus?: string;
}

export function AdminDriverCard({
  driver,
  onPress,
  isLast = false,
}: {
  driver: AdminDriverSummary;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const docOk = driver.docStatus === 'approved';
  const bgOk = driver.bgStatus === 'approved';
  const fullyCleared = docOk && bgOk;
  const anyRejected = driver.docStatus === 'rejected' || driver.bgStatus === 'rejected';

  const ovType = fullyCleared ? 'cleared' : anyRejected ? 'action' : 'pending';
  const ovLabel = fullyCleared ? 'CLEARED' : anyRejected ? 'ACTION NEEDED' : 'PENDING';
  const ovIcon: keyof typeof MaterialIcons.glyphMap = fullyCleared
    ? 'verified-user'
    : anyRejected
    ? 'gpp-bad'
    : 'hourglass-top';

  const ovColor = fullyCleared ? '#00E297' : anyRejected ? '#FFB4AB' : '#FFE399';
  const ovBg = fullyCleared
    ? 'rgba(0, 226, 151, 0.12)'
    : anyRejected
    ? 'rgba(255, 180, 171, 0.12)'
    : 'rgba(244, 195, 0, 0.12)';
  const ovBorder = fullyCleared
    ? 'rgba(0, 226, 151, 0.35)'
    : anyRejected
    ? 'rgba(255, 180, 171, 0.35)'
    : 'rgba(244, 195, 0, 0.35)';

  const initials = (driver.name || 'D')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.rosterItem,
        !isLast && styles.borderBottom,
        pressed && styles.itemPressed,
      ]}
    >
      {/* Driver Avatar */}
      <LinearGradient
        colors={[colors.primaryContainer, '#262A34']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>{initials}</Text>
      </LinearGradient>

      {/* Info */}
      <View style={styles.driverInfo}>
        <Text style={styles.driverName} numberOfLines={1}>
          {driver.name || 'Unnamed Driver'}
        </Text>
        <Text style={styles.driverEmail} numberOfLines={1}>
          {driver.email || '—'}
        </Text>
      </View>

      {/* Overall Status Badge */}
      <View style={[styles.overallStatus, { backgroundColor: ovBg, borderColor: ovBorder }]}>
        <MaterialIcons name={ovIcon} size={13} color={ovColor} />
        <Text style={[styles.overallStatusText, { color: ovColor }]}>{ovLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  itemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
  },
  driverInfo: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  driverEmail: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
  },
  overallStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  overallStatusText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
