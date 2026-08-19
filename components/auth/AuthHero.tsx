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
}

export function AuthHero({
  icon,
  iconBgColor = colors.secondaryContainer,
  iconBorderColor = colors.secondaryContainer,
  glowType = 'gold',
  title,
  subtitle,
}: AuthHeroProps) {
  const glowStyle = glowType === 'gold' ? shadows.goldGlow : shadows.cobaltGlow;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
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
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.gutter,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14.5,
    fontWeight: '400',
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
});
