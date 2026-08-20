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
import { APP_CONFIG } from '@/lib/config';
import { spacing, colors, gradients } from '@/constants/design';
import { CustomButton } from '@/components/core';
import { TERMS_METADATA, TERMS_SECTIONS, setGlobalTermsAgreed } from '@/components/legal';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <YStack gap="$2" marginBottom="$5">
      <SizableText size="$4" fontWeight="800" color="$color12">
        {title}
      </SizableText>
      {children}
    </YStack>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <SizableText size="$3" color="$color11" lineHeight={22}>
      {children}
    </SizableText>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <XStack gap="$2" alignItems="flex-start">
      <SizableText size="$3" color="$color9">
        •
      </SizableText>
      <SizableText size="$3" color="$color11" flex={1} lineHeight={22}>
        {children}
      </SizableText>
    </XStack>
  );
}

export default function TermsScreen() {
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
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/role-select'))}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <ChevronLeft size={24} color={colors.onSurface} />
        </Pressable>
        <SizableText size="$6" fontWeight="700" color="$color12">
          Terms of Use
        </SizableText>
      </XStack>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <YStack gap="$2" marginBottom="$6">
          <SizableText size="$3" fontWeight="600" color={colors.onSurface}>
            Effective: {TERMS_METADATA.effectiveDate}
          </SizableText>
          <SizableText size="$3" color="$color10" lineHeight={22}>
            These Terms of Use ("Terms") govern your use of {APP_CONFIG.APP_NAME} (the "App"), operated by {TERMS_METADATA.contactName} ("we," "us," or "our"). By using the App — whether as a customer placing an order or a driver accepting and delivering orders — you agree to these Terms. If you do not agree, do not use the App.
          </SizableText>
        </YStack>

        {TERMS_SECTIONS.map((section) => (
          <Section key={section.id} title={section.title}>
            {section.paragraphs?.map((p, idx) => (
              <Body key={idx}>{p}</Body>
            ))}
            {section.bullets && (
              <YStack gap="$2" paddingLeft="$2">
                {section.bullets.map((b, idx) => (
                  <Bullet key={idx}>{typeof b === 'string' ? b : b.text}</Bullet>
                ))}
              </YStack>
            )}
            {section.id === 'contact' && (
              <SizableText size="$5" fontWeight="700" color="$color12" marginTop="$2">
                {TERMS_METADATA.contactEmail}
              </SizableText>
            )}
          </Section>
        ))}
      </ScrollView>

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
          © {new Date().getFullYear()} {TERMS_METADATA.contactName}. All rights reserved.
        </Text>
      </View>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
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
