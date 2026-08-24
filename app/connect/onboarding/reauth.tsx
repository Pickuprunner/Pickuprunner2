import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { RefreshCw } from '@blinkdotnew/mobile-ui';

import { useDriverId } from '@/hooks/useDriverId';
import { useAuth } from '@/hooks/useAuth';
import { connectApi } from '@/apis/connect';
import { openStripeOnboardingSession } from '@/lib/stripeConnect';
import { colors } from '@/constants/design';

const BG = colors.background || '#0F131C';
const BLUE = colors.primaryContainer || '#0066FF';

export default function OnboardingReauthScreen() {
  const driverId = useDriverId();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function refreshLink() {
      if (!driverId) return;
      try {
        setLoading(true);
        let res: any;
        try {
          res = await connectApi.createOnboardingLink();
        } catch (e) {
          res = await connectApi.autoCreateAccount({ driverEmail: user?.email, driverUserId: driverId });
        }
        const url = res?.url || res?.data?.url;
        if (url) {
          await openStripeOnboardingSession(url);
          router.replace('/(tabs)/profile');
        } else {
          setError('Failed to generate a new Stripe onboarding link.');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to refresh onboarding session.');
      } finally {
        setLoading(false);
      }
    }
    refreshLink();
  }, [driverId, user?.email]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <RefreshCw size={36} color={BLUE} />
        </View>
        <Text style={styles.title}>Refreshing Setup Session</Text>
        <Text style={styles.subtitle}>
          Stripe onboarding links are single-use and expire quickly. Generating a new link...
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 12 }} />
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/profile')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Return to Driver Profile</Text>
          </TouchableOpacity>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#161922',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 28,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: BLUE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
