import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '@/constants/design';

export interface AdminStatCardProps {
  label: string;
  value: number;
  color?: string;
  icon: React.ReactNode;
}

export function AdminStatCard({
  label,
  value,
  color = colors.primary,
  icon,
}: AdminStatCardProps) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Top Accent Gradient Border */}
        <LinearGradient
          colors={['transparent', `${color}70`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topHighlight}
        />

        {/* Stat Icon Box */}
        <View style={[styles.iconContainer, { borderColor: `${color}40` }]}>
          {icon}
        </View>

        {/* Values */}
        <View style={styles.textContainer}>
          <Text style={[styles.valueText, { color }]}>{value}</Text>
          <Text style={styles.labelText}>{label}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minHeight: 112,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    borderWidth: 1,
  },
  textContainer: {
    marginTop: 'auto',
    gap: 3,
    alignItems: 'flex-start',
  },
  valueText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
    textAlign: 'left',
  },
  labelText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.outline,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'left',
  },
});
