import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '@/constants/design';

interface AuthHeroProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconBorderColor?: string;
  glowType?: 'gold' | 'cobalt';
  title: string;
  subtitle: string;
  compact?: boolean;
}

export function AuthHero({
  icon,
  iconBgColor = colors.secondaryContainer,
  iconBorderColor = colors.secondaryContainer,
  glowType = 'gold',
  title,
  subtitle,
  compact = false,
}: AuthHeroProps) {
  const glowStyle = glowType === 'gold' ? shadows.goldGlow : shadows.cobaltGlow;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View
        style={[
          styles.badge,
          compact && styles.badgeCompact,
          {
            backgroundColor: iconBgColor,
            borderColor: iconBorderColor,
            shadowColor: glowStyle.shadowColor,
            shadowOffset: glowStyle.shadowOffset,
            shadowOpacity: glowStyle.shadowOpacity,
            shadowRadius: glowStyle.shadowRadius,
            elevation: glowStyle.elevation,
          },
        ]}
      >
        {icon}
      </View>
      <View style={[styles.textContainer, compact && styles.textContainerCompact]}>
        <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
      </View>
    </View>
  );
}

export default AuthHero;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.gutter,
  },
  containerCompact: {
    marginBottom: spacing.sm,
    gap: 8,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCompact: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  textContainer: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.gutter,
  },
  textContainerCompact: {
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titleCompact: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 14.5,
    fontWeight: '400',
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
});
