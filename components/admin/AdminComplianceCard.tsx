import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius } from '@/constants/design';

export interface ComplianceStatItem {
  label: string;
  value: number;
  color: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
}

export interface AdminComplianceCardProps {
  title: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  badgeText: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  highlightColor?: string;
  stats: ComplianceStatItem[];
  actionText: string;
  onAction?: () => void;
}

export function AdminComplianceCard({
  title,
  iconName,
  badgeText,
  badgeColor = '#FFE399',
  badgeBg = 'rgba(244, 195, 0, 0.12)',
  badgeBorder = 'rgba(244, 195, 0, 0.35)',
  highlightColor = 'rgba(0, 102, 255, 0.4)',
  stats,
  actionText,
  onAction,
}: AdminComplianceCardProps) {
  const total = stats.reduce((acc, s) => acc + s.value, 0);

  return (
    <View style={styles.card}>
      {/* Top Accent Gradient Border */}
      <LinearGradient
        colors={['transparent', highlightColor, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topHighlight}
      />

      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleLeft}>
          <View style={styles.iconBox}>
            <MaterialIcons name={iconName} size={17} color={colors.primary} />
          </View>
          <Text style={styles.titleText}>{title}</Text>
        </View>

        <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
        </View>
      </View>

      {/* Action Navigation Row */}
      <Pressable
        onPress={onAction}
        hitSlop={8}
        style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.actionText}>{actionText}</Text>
        <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
      </Pressable>

      {/* Stats Breakdown Row (Moved to Bottom) */}
      <View style={styles.statsRow}>
        {stats.map((stat, idx) => (
          <View key={idx} style={styles.statChip}>
            <MaterialIcons name={stat.iconName} size={14} color={stat.color} />
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Proportional Distribution Bar (Bottom) */}
      <View style={styles.barContainer}>
        {total === 0 ? (
          <View style={[styles.barSegment, { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
        ) : (
          stats.map((stat, idx) => {
            if (stat.value <= 0) return null;
            return (
              <View
                key={idx}
                style={[
                  styles.barSegment,
                  {
                    flex: stat.value,
                    backgroundColor: stat.color,
                  },
                ]}
              />
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    gap: 14,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0A0E17',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.outline,
    textTransform: 'capitalize',
  },
  barContainer: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
  },
  barSegment: {
    height: '100%',
    borderRadius: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.2,
  },
});
