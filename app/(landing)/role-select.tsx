import React, { useState } from 'react';
import { Pressable, StyleSheet, Platform, View, StatusBar, ScrollView, Text } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Truck,
  ShoppingBag,
  ChevronRight,
  Zap,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { saveRole, AppRole } from '@/hooks/useRole';
import { colors, gradients, shadows, borderRadius, spacing } from '@/constants/design';
import { APP_CONFIG } from '@/lib/config';

export default function RoleSelectScreen() {
  const insets = useSafeAreaInsets();
  const [selecting, setSelecting] = useState<AppRole | null>(null);

  const handleSelect = async (role: AppRole) => {
    if (selecting) return;
    setSelecting(role);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    }
    await saveRole(role);
    setSelecting(null);
    if (role === 'customer') {
      router.push('/(auth)/customer-auth');
    } else {
      router.push('/(auth)/sign-in');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={gradients.heroGlow}
        locations={gradients.heroGlowLocations}
        style={[styles.heroGlow, { height: 360 + insets.top }]}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(
              insets.top + spacing.xl,
              Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 36 : 60
            ),
            paddingBottom: Math.max(insets.bottom + spacing.xl, 44),
          },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logoImage}
              contentFit="cover"
              transition={200}
            />
          </View>
          <Text style={styles.brandTitle}>
            <Text style={styles.brandTitleFirst}>Pickup</Text>
            <Text style={styles.brandTitleSecond}>Runner</Text>
          </Text>
          <Text style={styles.tagline}>{APP_CONFIG.TAGLINE}</Text>
        </View>

        <View style={styles.rolesSection}>
          <Text style={styles.sectionHeader}>HOW ARE YOU USING THE APP?</Text>

          <Pressable
            onPress={() => handleSelect('customer')}
            disabled={!!selecting}
            style={({ pressed }) => [
              styles.glassCard,
              pressed && styles.customerCardPressed,
              selecting === 'customer' && styles.customerCardActive,
            ]}
          >
            <View style={styles.customerIconCircle}>
              <ShoppingBag size={24} color="#0F131C" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>I'm a Customer</Text>
              <Text style={styles.cardSubtitle}>Sign up or sign in to place orders</Text>
            </View>
            <ChevronRight size={20} color={colors.outline} />
          </Pressable>
          <Pressable
            onPress={() => handleSelect('driver')}
            disabled={!!selecting}
            style={({ pressed }) => [
              styles.glassCard,
              pressed && styles.driverCardPressed,
              selecting === 'driver' && styles.driverCardActive,
            ]}
          >
            <View style={styles.driverIconCircle}>
              <Truck size={24} color="#0F131C" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>I'm a Driver</Text>
              <Text style={styles.cardSubtitle}>View orders, navigate, mark delivered</Text>
            </View>
            <ChevronRight size={20} color={colors.outline} />
          </Pressable>

          <Text style={styles.switchRolesHint}>Switch roles anytime from Profile</Text>
        </View>
        <View style={styles.footerSection}>
          <Pressable
            onPress={async () => {
              if (selecting) return;
              setSelecting('driver');
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
              await AsyncStorage.setItem('app_role', 'driver');
              await AsyncStorage.setItem('driver_test_mode', 'true');
              router.replace('/(tabs)');
            }}
            disabled={!!selecting}
            style={({ pressed }) => [
              styles.testDriverButton,
              pressed && styles.testDriverButtonPressed,
            ]}
          >
            <Zap size={14} color={colors.secondaryContainer} />
            <Text style={styles.testDriverButtonText}>Enter as test driver</Text>
          </Pressable>
          <View style={styles.linksRow}>
            <Text
              style={styles.linkText}
              onPress={() => router.push('/privacy-policy')}
            >
              Privacy Policy
            </Text>
            <Text style={styles.linkDot}>·</Text>
            <Text
              style={styles.linkText}
              onPress={() => router.push('/terms')}
            >
              Terms of Use
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.marginMobile,
    gap: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoContainer: {
    width: 108,
    height: 108,
    borderRadius: 54,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 14,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 54,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  brandTitleFirst: {
    color: '#3B82F6',
    fontWeight: '800',
  },
  brandTitleSecond: {
    color: '#FFD200',
    fontWeight: '800',
  },
  tagline: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  rolesSection: {
    gap: 14,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.outline,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  glassCard: {
    backgroundColor: colors.glassLevel2Bg,
    borderRadius: borderRadius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  customerCardPressed: {
    backgroundColor: 'rgba(244, 195, 0, 0.08)',
    borderColor: 'rgba(244, 195, 0, 0.35)',
    transform: [{ scale: 0.98 }],
  },
  customerCardActive: {
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    borderColor: colors.secondaryContainer,
  },
  driverCardPressed: {
    backgroundColor: 'rgba(0, 102, 255, 0.08)',
    borderColor: 'rgba(0, 102, 255, 0.35)',
    transform: [{ scale: 0.98 }],
  },
  driverCardActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    borderColor: colors.primaryContainer,
  },
  customerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
  },
  cardSubtitle: {
    fontSize: 13.5,
    color: colors.onSurfaceVariant,
  },
  switchRolesHint: {
    fontSize: 13,
    color: colors.outline,
    textAlign: 'center',
    marginTop: 8,
  },
  footerSection: {
    alignItems: 'center',
    gap: 16,
    marginTop: spacing.lg,
  },
  testDriverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
    backgroundColor: 'rgba(28, 31, 41, 0.65)',
  },
  testDriverButtonPressed: {
    backgroundColor: 'rgba(28, 31, 41, 0.95)',
    borderColor: 'rgba(0, 102, 255, 0.5)',
    transform: [{ scale: 0.97 }],
  },
  testDriverButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    fontSize: 13,
    color: colors.outline,
    textDecorationLine: 'underline',
  },
  linkDot: {
    fontSize: 13,
    color: colors.outline,
  },
});
