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
    <SafeArea edges={['top', 'bottom']}>
      {/* Header */}
      <XStack
        alignItems="center"
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderBottomWidth={1}
        borderBottomColor="rgba(255,255,255,0.08)"
        gap="$3"
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
        <YStack gap="$2" marginBottom="$4">
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
          <P>We collect information you provide directly to us, including:</P>
          <Bullet><Bold>Account Information:</Bold> Name, email address, password, and account role (driver or customer).</Bullet>
          <Bullet><Bold>Driver Verification Data:</Bold> Driver's license images, vehicle insurance documents, and background check details (full legal name, date of birth, SSN last 4, address).</Bullet>
          <Bullet><Bold>Order Information:</Bold> Pickup and delivery addresses, customer phone numbers, item descriptions, and delivery notes.</Bullet>
          <Bullet><Bold>Payment Information:</Bold> Stripe Connect account identifiers, payout request records, and payment receipts. We do not store full credit card numbers.</Bullet>
          <Bullet><Bold>Location Data:</Bold> Precise or approximate geolocation when you use the app for delivery navigation or order tracking.</Bullet>
          <Bullet><Bold>Communications:</Bold> In-app chat messages between drivers and customers, customer support requests.</Bullet>
        </Section>

        <Section title="2. How We Use Your Information">
          <P>We use the information we collect to:</P>
          <Bullet>Provide, maintain, and improve our delivery services.</Bullet>
          <Bullet>Process driver verification and background checks.</Bullet>
          <Bullet>Facilitate communication between customers and drivers.</Bullet>
          <Bullet>Process payments and driver earnings payouts via Stripe.</Bullet>
          <Bullet>Detect, prevent, and address fraud, security breaches, and illegal activities.</Bullet>
          <Bullet>Comply with applicable legal requirements and industry standards.</Bullet>
        </Section>

        <Section title="3. Information Sharing">
          <P>We do not sell your personal information. We may share your information:</P>
          <Bullet><Bold>Between Users:</Bold> Basic driver info (name, vehicle, phone) is shared with customers for active deliveries. Customer name and address are shared with drivers.</Bullet>
          <Bullet><Bold>Service Providers:</Bold> With Stripe for payment processing and identity verification services.</Bullet>
          <Bullet><Bold>Legal Requirements:</Bold> When required by law, subpoena, or to protect the safety of any person.</Bullet>
        </Section>

        <Section title="4. Data Retention and Security">
          <P>
            We retain personal information for as long as necessary to provide services and comply with legal obligations.
            Sensitive verification documents are stored securely using industry-standard encryption and access controls.
          </P>
        </Section>

        <Section title="5. Your Rights & Account Deletion">
          <P>
            You may request deletion of your account and associated personal data at any time via the{' '}
            <Bold>Delete Account</Bold> option in your profile settings.
          </P>
          <P>
            Upon deletion, your verification records, background check submissions, payout history, and order associations
            will be permanently purged from our systems, subject to legal retention obligations.
          </P>
        </Section>

        <Section title="6. Children's Privacy">
          <P>
            Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal
            information from children under 18.
          </P>
        </Section>

        <Section title="7. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify you of any changes by updating the
            "Last updated" date at the top of this policy.
          </P>
        </Section>

        <Section title="8. Contact Us">
          <P>
            If you have questions about this Privacy Policy or our privacy practices, contact us at:{' '}
            <Bold>{CONTACT_EMAIL}</Bold>
          </P>
        </Section>

        <View style={styles.footer}>
          <SizableText size="$2" color="$color8" textAlign="center">
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
