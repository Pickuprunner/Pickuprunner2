import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { YStack, XStack, SizableText } from '@blinkdotnew/mobile-ui';
import { colors, borderRadius } from '@/constants/design';

interface TermsAgreementProps {
  agreed: boolean;
  onToggle: () => void;
  accentColor?: string;
}

export function TermsAgreement({
  agreed,
  onToggle,
  accentColor = colors.primaryContainer,
}: TermsAgreementProps) {
  return (
    <YStack gap="$2">
      <XStack gap="$3">
        <Pressable
          onPress={() => router.push('/terms')}
          style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.6 }]}
        >
          <SizableText
            size="$2"
            fontWeight="700"
            color={colors.secondaryContainer}
            textDecorationLine="underline"
          >
            Terms of Use
          </SizableText>
        </Pressable>
        <SizableText size="$2" color={colors.outline}>
          ·
        </SizableText>
        <Pressable
          onPress={() => router.push('/privacy-policy')}
          style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.6 }]}
        >
          <SizableText
            size="$2"
            fontWeight="700"
            color={colors.secondaryContainer}
            textDecorationLine="underline"
          >
            Privacy Policy
          </SizableText>
        </Pressable>
      </XStack>
      <Pressable onPress={onToggle} style={styles.termsRow}>
        <YStack
          width={22}
          height={22}
          borderRadius={borderRadius.xs}
          borderWidth={1.5}
          borderColor={agreed ? accentColor : colors.outlineVariant}
          backgroundColor={agreed ? accentColor : 'transparent'}
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          {agreed && (
            <SizableText size="$1" fontWeight="900" color="#FFFFFF">
              ✓
            </SizableText>
          )}
        </YStack>
        <SizableText size="$2" color={colors.onSurfaceVariant} flex={1} lineHeight={20}>
          I agree to the Terms of Use and Privacy Policy
        </SizableText>
      </Pressable>
    </YStack>
  );
}

export default TermsAgreement;

const styles = StyleSheet.create({
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  linkBtn: {
    paddingVertical: 2,
  },
});
