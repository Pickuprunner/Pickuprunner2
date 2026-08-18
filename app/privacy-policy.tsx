import React from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { YStack, SizableText, SafeArea, XStack, ChevronLeft } from '@blinkdotnew/mobile-ui';
import { router } from 'expo-router';
import { colors, spacing, typography } from '@/constants/design';

const LAST_UPDATED = 'May 9, 2025';
const APP_NAME = 'Pickup Runner';
const CONTACT_EMAIL = 'PickupRunner@gmail.com';

export default function PrivacyPolicyScreen() {
  return (
    <SafeArea edges={['top', 'bottom']} backgroundColor={colors.background} flex={1}>
      {/* Header */}
      <XStack
        alignItems="center"
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderBottomWidth={1}
        borderBottomColor="rgba(255,255,255,0.08)"
        space="$3"
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <SizableText size="$6" fontWeight="700" color="$color12">
          Privacy Policy
        </SizableText>
      </XStack>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <YStack space="$2" marginBottom="$4">
          <SizableText size="$2" color="$color9">
            Last updated: {LAST_UPDATED}
          </SizableText>
          <SizableText size="$3" color="$color11" lineHeight={22}>
            {APP_NAME} ("we", "our", or "us") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, and share information
            about you when you use our mobile application and services.
          </SizableText>
        </YStack>

        <Section title="1. Information We Collect">
          <Bullet>
            <Bold>Contact information</Bold> — name, phone number, and email address
            you provide when placing an order.
          </Bullet>
          <Bullet>
            <Bold>Delivery information</Bold> — pickup and delivery addresses you enter.
          </Bullet>
          <Bullet>
            <Bold>Payment information</Bold> — processed securely by Stripe. We do not
            store your card number, expiry, or CVV.
          </Bullet>
          <Bullet>
            <Bold>Location data</Bold> — approximate location may be used to calculate
            delivery distance. We do not track your location continuously.
          </Bullet>
          <Bullet>
            <Bold>Device information</Bold> — device type, operating system, and app
            version for troubleshooting purposes.
          </Bullet>
        </Section>

        <Section title="2. How We Use Your Information">
          <Bullet>To process and fulfill your delivery orders.</Bullet>
          <Bullet>To contact you about your order status via phone or email.</Bullet>
          <Bullet>To calculate delivery fees based on distance.</Bullet>
          <Bullet>To improve the app and resolve technical issues.</Bullet>
          <Bullet>To comply with legal obligations.</Bullet>
        </Section>

        <Section title="3. Information Sharing">
          <P>
            We do not sell your personal information. We may share your information only in
            these limited circumstances:
          </P>
          <Bullet>
            <Bold>Drivers</Bold> — your name, phone number, and delivery address are shared
            with the assigned driver to complete your delivery.
          </Bullet>
          <Bullet>
            <Bold>Stripe</Bold> — payment data is handled by Stripe, Inc. under their own
            privacy policy at stripe.com/privacy.
          </Bullet>
          <Bullet>
            <Bold>Legal</Bold> — we may disclose information if required by law or to
            protect our rights and the safety of our users.
          </Bullet>
        </Section>

        <Section title="4. Data Retention">
          <P>
            We retain your order information for up to 2 years for accounting and support
            purposes. You may request deletion of your data at any time by contacting us.
          </P>
        </Section>

        <Section title="5. Children's Privacy">
          <P>
            {APP_NAME} is not intended for users under 18 years of age. We do not knowingly
            collect personal information from minors.
          </P>
        </Section>

        <Section title="6. Security">
          <P>
            We use industry-standard security measures to protect your information. Payment
            processing is handled entirely by Stripe and is PCI-DSS compliant. However, no
            method of transmission over the internet is 100% secure.
          </P>
        </Section>

        <Section title="7. Your Rights">
          <P>You have the right to:</P>
          <Bullet>Access the personal information we hold about you.</Bullet>
          <Bullet>Request correction of inaccurate information.</Bullet>
          <Bullet>Request deletion of your data.</Bullet>
          <Bullet>Opt out of non-essential communications.</Bullet>
          <P>
            To exercise any of these rights, contact us at{' '}
            <SizableText size="$3" color="$blue10">{CONTACT_EMAIL}</SizableText>.
          </P>
        </Section>

        <Section title="8. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify you of any
            significant changes by updating the "Last updated" date at the top of this page.
            Continued use of the app after changes constitutes acceptance of the updated policy.
          </P>
        </Section>

        <Section title="9. Contact Us">
          <P>
            If you have questions about this Privacy Policy, please contact us:
          </P>
          <Bullet>Email: {CONTACT_EMAIL}</Bullet>
          <Bullet>App: Pickup Runner</Bullet>
        </Section>

        <View style={styles.footer}>
          <SizableText size="$2" color="$color9" textAlign="center">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </SizableText>
        </View>
      </ScrollView>
    </SafeArea>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <YStack space="$2" marginBottom="$5">
      <SizableText size="$5" fontWeight="700" color="$color12" marginBottom="$1">
        {title}
      </SizableText>
      <YStack space="$2">{children}</YStack>
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
    <XStack space="$2" alignItems="flex-start">
      <SizableText size="$3" color="$color9" marginTop={2}>•</SizableText>
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
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
});
