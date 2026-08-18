import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  ArrowLeft,
  FileText,
} from '@blinkdotnew/mobile-ui';
import { Pressable } from 'react-native';
import { APP_CONFIG } from '@/lib/config';
import { spacing, borderRadius } from '@/constants/design';

const EFFECTIVE_DATE = 'May 8, 2025';
const APP = APP_CONFIG.APP_NAME;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <YStack space="$2" marginBottom="$5">
      <SizableText size="$4" fontWeight="800" color="$color12">{title}</SizableText>
      {children}
    </YStack>
  );
}

function Body({ children }: { children: string }) {
  return (
    <SizableText size="$3" color="$color11" lineHeight={22}>{children}</SizableText>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <XStack space="$2" alignItems="flex-start">
      <SizableText size="$3" color="$color9">•</SizableText>
      <SizableText size="$3" color="$color11" flex={1} lineHeight={22}>{children}</SizableText>
    </XStack>
  );
}

export default function TermsScreen() {
  return (
    <SafeArea>
      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        space="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/role-select')} hitSlop={12}>
          <ArrowLeft size={22} color="$color10" />
        </Pressable>
        <XStack flex={1} space="$2" alignItems="center">
          <FileText size={18} color="$color9" />
          <SizableText size="$5" fontWeight="800" color="$color12">Terms of Use</SizableText>
        </XStack>
      </XStack>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <YStack space="$2" marginBottom="$6">
          <SizableText size="$2" color="$color9">Effective: {EFFECTIVE_DATE}</SizableText>
          <SizableText size="$3" color="$color10" lineHeight={22}>
            These Terms of Use ("Terms") govern your use of {APP} (the "App"), operated by Pickup Runner ("we," "us," or "our"). By using the App — whether as a customer placing an order or a driver accepting and delivering orders — you agree to these Terms. If you do not agree, do not use the App.
          </SizableText>
        </YStack>

        {/* ── Section 1 ── */}
        <Section title="1. Who May Use This App">
          <Body>
            You must be at least 18 years old to use this App. By using the App you represent that you meet this requirement and that the information you provide is accurate and complete.
          </Body>
          <Body>
            Drivers must additionally: (a) hold a valid driver's license and maintain appropriate vehicle insurance; (b) comply with all applicable federal, state, and local laws while making deliveries; and (c) have received express authorization from Pickup Runner to deliver on its behalf.
          </Body>
        </Section>

        {/* ── Section 2 ── */}
        <Section title="2. Customer Terms">
          <Body>By placing an order through the App, you agree to the following:</Body>
          <YStack space="$2" paddingLeft="$2">
            <Bullet>You are ordering a delivery service through Pickup Runner in your service area. Pickup Runner is a delivery service only and is not affiliated with, endorsed by, or responsible for any store, restaurant, or business from which items are picked up.</Bullet>
            <Bullet>Pickup Runner does not sell, manufacture, or guarantee any products. Product availability, pricing, quality, and substitutions are determined solely by the store or business fulfilling your order.</Bullet>
            <Bullet>A delivery fee and applicable mileage surcharge will be charged at checkout. These fees are non-refundable once a driver has accepted your order.</Bullet>
            <Bullet>Any tip you add goes entirely to the driver assigned to your order. Tips are also non-refundable once the driver begins the pickup.</Bullet>
            <Bullet>Payment is processed securely through Stripe. We do not store your card details. By paying, you also agree to Stripe's Terms of Service (stripe.com/legal).</Bullet>
            <Bullet>You must be present at the delivery address (or designate a responsible adult) to receive the order. Pickup Runner and its drivers are not liable for orders left unattended at your request.</Bullet>
            <Bullet>Alcohol and tobacco deliveries are subject to applicable state and local law. You must present a valid government-issued photo ID confirming you are 21+ upon delivery. The driver may refuse delivery if valid ID is not presented.</Bullet>
            <Bullet>Refunds for damaged, incorrect, or missing items must be requested within 24 hours of delivery. Pickup Runner will assist in communicating with the store but all refund decisions are at the sole discretion of the store or business fulfilling the order.</Bullet>
          </YStack>
        </Section>

        {/* ── Section 3 ── */}
        <Section title="3. Driver Terms">
          <Body>By creating a driver account and accepting deliveries through the App, you agree to the following:</Body>
          <YStack space="$2" paddingLeft="$2">
            <Bullet>You are an independent contractor, not an employee of Pickup Runner or the App operator. You are solely responsible for your taxes, insurance, vehicle maintenance, and compliance with applicable law.</Bullet>
            <Bullet>You must handle all items with care and deliver them to the correct address in the condition received. You are liable for items damaged due to your negligence.</Bullet>
            <Bullet>You must not open, tamper with, or consume any part of a customer's order.</Bullet>
            <Bullet>You must verify customer ID for age-restricted items (alcohol, tobacco) and refuse delivery if valid ID is not presented.</Bullet>
            <Bullet>Earnings displayed in the App are estimates based on completed and paid orders. Actual payout amounts are confirmed at time of payout request approval.</Bullet>
            <Bullet>Payout requests are reviewed and processed manually by the App administrator. Processing time may vary. We are not responsible for delays caused by third-party payment services (Venmo, Zelle, etc.).</Bullet>
            <Bullet>Pickup Runner and the App operator reserve the right to deactivate your driver account at any time for violation of these Terms, fraudulent activity, customer complaints, or at our sole discretion.</Bullet>
          </YStack>
        </Section>

        {/* ── Section 4 ── */}
        <Section title="4. Prohibited Conduct">
          <Body>You agree not to:</Body>
          <YStack space="$2" paddingLeft="$2">
            <Bullet>Use the App for any unlawful purpose or in violation of any applicable law or regulation.</Bullet>
            <Bullet>Submit false, misleading, or fraudulent orders or payout requests.</Bullet>
            <Bullet>Attempt to circumvent the App's payment or authentication systems.</Bullet>
            <Bullet>Harass, threaten, or abuse other users, drivers, or store employees.</Bullet>
            <Bullet>Reverse-engineer, copy, or redistribute any part of the App without written permission.</Bullet>
          </YStack>
        </Section>

        {/* ── Section 5 ── */}
        <Section title="5. Disclaimer of Warranties">
          <Body>
            THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES. YOUR USE OF THE APP IS AT YOUR SOLE RISK.
          </Body>
          <Body>
            Pickup Runner does not guarantee the availability of any particular product. Product availability, pricing, and store hours are subject to change without notice.
          </Body>
        </Section>

        {/* ── Section 6 ── */}
        <Section title="6. Limitation of Liability">
          <Body>
            TO THE FULLEST EXTENT PERMITTED BY LAW, PICKUP RUNNER AND THE APP OPERATOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE APP, INCLUDING BUT NOT LIMITED TO LOST PROFITS, LOST DATA, OR PERSONAL INJURY.
          </Body>
          <Body>
            OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM USE OF THE APP SHALL NOT EXCEED THE DELIVERY FEES PAID BY YOU IN THE TRANSACTION GIVING RISE TO THE CLAIM.
          </Body>
        </Section>

        {/* ── Section 7 ── */}
        <Section title="7. Privacy">
          <Body>
            We collect the information you provide (name, phone, email, delivery address, payment data) solely to fulfill orders and process payouts. We do not sell your personal information to third parties. Payment data is handled exclusively by Stripe and is never stored on our servers.
          </Body>
          <Body>
            By using the App, you consent to the collection and use of your information as described above and in our Privacy Policy, available upon request.
          </Body>
        </Section>

        {/* ── Section 8 ── */}
        <Section title="8. Governing Law">
          <Body>
            These Terms are governed by the laws of the State of Arizona, without regard to its conflict-of-law principles. Any dispute arising from these Terms shall be resolved exclusively in the state or federal courts located in Pima County, Arizona.
          </Body>
        </Section>

        {/* ── Section 9 ── */}
        <Section title="9. Changes to These Terms">
          <Body>
            We may update these Terms from time to time. We will notify users of material changes by updating the effective date above and, where feasible, by posting a notice in the App. Continued use of the App after changes constitutes acceptance of the updated Terms.
          </Body>
        </Section>

        {/* ── Section 10 ── */}
        <Section title="10. Contact">
          <Body>
            Questions about these Terms? Contact us at:
          </Body>
          <YStack
            backgroundColor="$color3"
            borderRadius={12}
            padding="$4"
            space="$1"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <SizableText size="$3" fontWeight="700" color="$color12">Pickup Runner</SizableText>
            <SizableText size="$3" color="$color10">PickupRunner@gmail.com</SizableText>
          </YStack>
        </Section>

      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});
