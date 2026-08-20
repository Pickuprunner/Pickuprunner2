import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, StatusBar, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  YStack,
  XStack,
  SizableText,
  ChevronLeft,
} from '@blinkdotnew/mobile-ui';
import { colors, spacing, gradients } from '@/constants/design';
import { CustomButton } from '@/components/core';
import { PRIVACY_METADATA, PRIVACY_SECTIONS, setGlobalTermsAgreed } from '@/components/legal';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const handleAccept = () => {
    setGlobalTermsAgreed(true);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/role-select');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={gradients.heroGlow}
        locations={gradients.heroGlowLocations}
        style={[styles.heroGlow, { height: 320 + topInset }]}
        pointerEvents="none"
      />

      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        style={{ paddingTop: topInset + 8 }}
        alignItems="center"
        gap="$3"
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.08)"
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <ChevronLeft size={24} color={colors.onSurface} />
        </Pressable>
        <SizableText size="$6" fontWeight="700" color="$color12">
          Privacy Policy
        </SizableText>
      </XStack>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <YStack gap="$2" marginBottom="$4">
          <SizableText size="$3" fontWeight="600" color={colors.onSurface}>
            Last updated: {PRIVACY_METADATA.lastUpdated}
          </SizableText>
          <SizableText size="$3" color="$color11" lineHeight={22}>
            {PRIVACY_METADATA.appName} ("we", "our", or "us") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, and share information
            about you when you use our mobile application and services.
          </SizableText>
        </YStack>

        {PRIVACY_SECTIONS.map((section) => (
          <Section key={section.id} title={section.title}>
            {section.paragraphs?.map((p, idx) => (
              <P key={idx}>{p}</P>
            ))}
            {section.bullets && (
              <YStack gap="$2">
                {section.bullets.map((b, idx) => {
                  if (typeof b === 'string') {
                    return <Bullet key={idx}>{b}</Bullet>;
                  }
                  return (
                    <Bullet key={idx}>
                      {b.boldPrefix && <Bold>{b.boldPrefix} </Bold>}
                      {b.text}
                    </Bullet>
                  );
                })}
              </YStack>
            )}
            {section.id === 'contact-us' && (
              <SizableText size="$5" fontWeight="700" color="$color12" marginTop="$2">
                {PRIVACY_METADATA.contactEmail}
              </SizableText>
            )}
          </Section>
        ))}
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 6 },
        ]}
      >
        <CustomButton
          title="I Understand"
          onPress={handleAccept}
        />
        <Text style={styles.copyrightText}>
          © {new Date().getFullYear()} {PRIVACY_METADATA.appName}. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <YStack gap="$2" marginBottom="$5">
      <SizableText size="$5" fontWeight="700" color="$color12" marginBottom="$1">
        {title}
      </SizableText>
      <YStack gap="$2">{children}</YStack>
    </YStack>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <SizableText size="$3" color="$color11" lineHeight={22}>
      {children}
    </SizableText>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <XStack gap="$2" alignItems="flex-start">
      <SizableText size="$3" color="$color9" marginTop={2}>
        •
      </SizableText>
      <SizableText size="$3" color="$color11" lineHeight={22} flex={1}>
        {children}
      </SizableText>
    </XStack>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return (
    <SizableText size="$3" fontWeight="700" color="$color12">
      {children}
    </SizableText>
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
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(15, 19, 28, 0.96)',
  },
  copyrightText: {
    fontSize: 11.5,
    color: colors.outline,
    textAlign: 'center',
  },
});
