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
import { CheckCircle, AlertTriangle } from '@blinkdotnew/mobile-ui';
import { useQueryClient } from '@tanstack/react-query';

import { useDriverId } from '@/hooks/useDriverId';
import { connectApi, ConnectStatusResponse } from '@/apis/connect';
import { colors } from '@/constants/design';

const BG = colors.background || '#0F131C';
const GREEN = colors.tertiary || '#00E297';
const GOLD = colors.secondaryContainer || '#F4C300';
const BLUE = colors.primaryContainer || '#0066FF';

export default function OnboardingSuccessScreen() {
  const driverId = useDriverId();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<ConnectStatusResponse | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await connectApi.getStatus();
        const data = (res as any)?.data || res;
        setStatusData(data);
        if (driverId) {
          queryClient.invalidateQueries({ queryKey: ['stripe_connect_status', driverId] });
        }
      } catch (err) {
        console.warn('[OnboardingSuccess] Failed to check status:', err);
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, [driverId, queryClient]);

  const payoutsEnabled = Boolean(statusData?.payoutsEnabled);
  const isConnected = Boolean(statusData?.connected || statusData?.stripeAccountId);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Verifying bank account status...</Text>
        </View>
      ) : payoutsEnabled ? (
        <View style={styles.card}>
          <View style={styles.iconCircleSuccess}>
            <CheckCircle size={44} color={GREEN} />
          </View>
          <Text style={styles.title}>Bank Account Connected!</Text>
          <Text style={styles.subtitle}>
            Your Stripe Connect account is active and verified. Direct deposit is now enabled for daily payouts.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/profile')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Return to Driver Profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.iconCirclePending}>
            <AlertTriangle size={44} color={GOLD} />
          </View>
          <Text style={styles.title}>Verification Under Review</Text>
          <Text style={styles.subtitle}>
            Stripe is processing your verification details. In some cases, verification can take a short time. Your payout status will update automatically once completed.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/profile')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Return to Driver Profile</Text>
          </TouchableOpacity>
        </View>
      )}
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
  iconCircleSuccess: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconCirclePending: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
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
