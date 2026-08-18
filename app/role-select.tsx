import React, { useState } from 'react';
import { Pressable, StyleSheet, Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  Truck,
  ShoppingBag,
  ChevronRight,
  Zap,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { saveRole, AppRole } from '@/hooks/useRole';
import { spacing, borderRadius } from '@/constants/design';
import { APP_CONFIG } from '@/lib/config';

// Pull from city/store config — change lib/config.ts to rebrand
const BLUE = APP_CONFIG.PRIMARY_COLOR;
const YELLOW = APP_CONFIG.SECONDARY_COLOR;
const DARK_BG = '#0A0A0F';

export default function RoleSelectScreen() {
  const [selecting, setSelecting] = useState<AppRole | null>(null);

  const handleSelect = async (role: AppRole) => {
    if (selecting) return;
    setSelecting(role);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    await saveRole(role);
    if (role === 'customer') {
      router.replace('/customer-auth');
    } else {
      // Drivers must sign in — sign-in handles verification routing
      router.replace('/sign-in');
    }
  };

  return (
    <SafeArea>
      <YStack flex={1} backgroundColor={DARK_BG}>
        {/* Hero gradient header — blue to dark */}
        <LinearGradient
          colors={[APP_CONFIG.GRADIENT_START, APP_CONFIG.GRADIENT_MID, APP_CONFIG.GRADIENT_END, '#0A0A0F']}
          locations={[0, 0.3, 0.65, 1]}
          style={styles.hero}
        >
          {/* Glow orb */}
          <View style={styles.glowOrb} />
          <YStack alignItems="center" gap="$3" paddingHorizontal="$6">
            <YStack
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor="rgba(245,196,0,0.15)"
              alignItems="center"
              justifyContent="center"
              borderWidth={2.5}
              borderColor={YELLOW}
              style={styles.iconGlow}
            >
              <Zap size={42} color={YELLOW} />
            </YStack>
            <YStack alignItems="center" gap="$2">
              <SizableText size="$9" fontWeight="900" color="white" textAlign="center" letterSpacing={-1}>
                {APP_CONFIG.APP_NAME}
              </SizableText>
              <SizableText size="$3" color="rgba(255,255,255,0.8)" textAlign="center">
                {APP_CONFIG.TAGLINE}
              </SizableText>
            </YStack>
          </YStack>
        </LinearGradient>

        {/* Cards section */}
        <YStack flex={1} paddingHorizontal="$5" paddingTop="$8" gap="$4" justifyContent="center">
          <SizableText
            size="$2"
            fontWeight="700"
            color="rgba(255,255,255,0.45)"
            textAlign="center"
            letterSpacing={2.5}
          >
            HOW ARE YOU USING THE APP?
          </SizableText>

          {/* Customer card — Yellow accent */}
          <Pressable
            onPress={() => handleSelect('customer')}
            disabled={!!selecting}
            style={({ pressed }) => [
              styles.roleCard,
              styles.customerCard,
              pressed && styles.roleCardPressed,
              selecting === 'customer' && styles.customerCardActive,
            ]}
          >
            <XStack alignItems="center" gap="$4">
              <View style={[styles.iconCircle, styles.customerIconCircle]}>
                <ShoppingBag size={26} color={YELLOW} />
              </View>
              <YStack flex={1} gap="$1">
                <XStack alignItems="center" gap="$2">
                  <SizableText size="$5" fontWeight="800" color="white">
                    I'm a Customer
                  </SizableText>
                  <View style={styles.roleTag}>
                    <SizableText size="$1" fontWeight="700" color={YELLOW}>ORDER</SizableText>
                  </View>
                </XStack>
                <SizableText size="$2" color="rgba(255,255,255,0.55)">
                  Sign up or sign in to place orders
                </SizableText>
              </YStack>
              <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
            </XStack>
          </Pressable>

          {/* Driver card — Blue accent */}
          <Pressable
            onPress={() => handleSelect('driver')}
            disabled={!!selecting}
            style={({ pressed }) => [
              styles.roleCard,
              styles.driverCard,
              pressed && styles.roleCardPressed,
              selecting === 'driver' && styles.driverCardActive,
            ]}
          >
            <XStack alignItems="center" gap="$4">
              <View style={[styles.iconCircle, styles.driverIconCircle]}>
                <Truck size={26} color={BLUE} />
              </View>
              <YStack flex={1} gap="$1">
                <XStack alignItems="center" gap="$2">
                  <SizableText size="$5" fontWeight="800" color="white">
                    I'm a Driver
                  </SizableText>
                  <View style={styles.driverTag}>
                    <SizableText size="$1" fontWeight="700" color={BLUE}>DRIVE</SizableText>
                  </View>
                </XStack>
                <SizableText size="$2" color="rgba(255,255,255,0.55)">
                  View orders, navigate, mark delivered
                </SizableText>
              </YStack>
              <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
            </XStack>
          </Pressable>

          <SizableText size="$2" color="rgba(255,255,255,0.3)" textAlign="center" marginTop="$2">
            Switch roles anytime from Profile
          </SizableText>

          {/* Test mode shortcut */}
          <Pressable
            onPress={async () => {
              if (selecting) return;
              setSelecting('driver');
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              await AsyncStorage.setItem('app_role', 'driver');
              await AsyncStorage.setItem('driver_test_mode', 'true');
              router.replace('/(tabs)');
            }}
            disabled={!!selecting}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: 'rgba(0,102,255,0.35)',
              backgroundColor: pressed ? 'rgba(0,102,255,0.15)' : 'rgba(0,102,255,0.08)',
              alignSelf: 'center',
              marginTop: 4,
            })}
          >
            <SizableText size="$2" fontWeight="700" color="$blue9">⚡ Enter as test driver</SizableText>
          </Pressable>

          <XStack justifyContent="center" gap="$2" marginTop="$4">
            <SizableText
              size="$1"
              color="rgba(255,255,255,0.35)"
              onPress={() => router.push('/privacy-policy')}
              textDecorationLine="underline"
            >
              Privacy Policy
            </SizableText>
            <SizableText size="$1" color="rgba(255,255,255,0.2)">·</SizableText>
            <SizableText
              size="$1"
              color="rgba(255,255,255,0.35)"
              onPress={() => router.push('/terms')}
              textDecorationLine="underline"
            >
              Terms of Use
            </SizableText>
          </XStack>
        </YStack>
      </YStack>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 52,
    paddingBottom: 64,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    top: -60,
    left: '50%',
    marginLeft: -120,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0,102,255,0.25)',
  },
  iconGlow: {
    shadowColor: '#F5C400',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 10,
  },
  roleCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
  },
  customerCard: {
    backgroundColor: '#111008',
    borderColor: 'rgba(245,196,0,0.25)',
  },
  driverCard: {
    backgroundColor: '#080D1A',
    borderColor: 'rgba(0,102,255,0.3)',
  },
  roleCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  customerCardActive: {
    borderColor: '#F5C400',
    borderWidth: 2,
  },
  driverCardActive: {
    borderColor: '#0066FF',
    borderWidth: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerIconCircle: {
    backgroundColor: 'rgba(245,196,0,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,196,0,0.35)',
  },
  driverIconCircle: {
    backgroundColor: 'rgba(0,102,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,102,255,0.4)',
  },
  roleTag: {
    backgroundColor: 'rgba(245,196,0,0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(245,196,0,0.4)',
  },
  driverTag: {
    backgroundColor: 'rgba(0,102,255,0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,102,255,0.4)',
  },
});
