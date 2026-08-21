import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/constants/design';

export interface TrackHeroTheme {
  icon: string;
  title: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  iconBg: string;
}

export interface TrackHeroCardProps {
  hero: TrackHeroTheme;
  isDelivered: boolean;
  deliveryPhoto?: string | null;
}

export function TrackHeroCard({ hero, isDelivered, deliveryPhoto }: TrackHeroCardProps) {
  return (
    <View style={[styles.heroCard, { backgroundColor: hero.bg, borderColor: hero.border }]}>
      {/* Pulse Radar Ring */}
      <View style={[styles.pulseOuterRing, { borderColor: hero.border }]}>
        <View style={[styles.heroIconBox, { backgroundColor: hero.iconBg }]}>
          <MaterialIcons name={hero.icon as any} size={36} color={hero.color} />
        </View>
      </View>

      <View style={styles.heroTextCol}>
        <Text style={[styles.heroTitle, { color: hero.color }]}>{hero.title}</Text>
        <Text style={styles.heroDesc}>{hero.desc}</Text>
      </View>

      {isDelivered && !!deliveryPhoto && (
        <View style={styles.photoContainer}>
          <View style={styles.photoHeader}>
            <MaterialIcons name="verified" size={16} color={colors.tertiary} />
            <Text style={styles.photoHeaderText}>Verified Delivery Photo</Text>
          </View>
          <Image source={{ uri: deliveryPhoto }} style={styles.deliveryImage} resizeMode="cover" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  pulseOuterRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    alignItems: 'center',
    gap: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroDesc: {
    fontSize: 13.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  photoContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.greenAlpha30,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginTop: 4,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.greenAlpha10,
    borderBottomWidth: 1,
    borderBottomColor: colors.greenAlpha30,
  },
  photoHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.tertiary,
  },
  deliveryImage: {
    width: '100%',
    height: 190,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
});
