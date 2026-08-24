import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { CreditCard, ChevronRight, AlertCircle } from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { useDriverId } from '@/hooks/useDriverId';
import { useConnectStatus, useConnectOnboard, openStripeOnboardingSession } from '@/lib/stripeConnect';
import { colors } from '@/constants/design';

const ELECTRIC_BLUE = '#0066FF';
const AMBER_GOLD = colors.secondaryContainer || '#F4C300';

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (Platform.OS !== 'web') {
    const feedback =
      style === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : style === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(feedback).catch(() => { });
  }
}

export interface StripeSetupBannerProps {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  dismissable?: boolean;
}

export function StripeSetupBanner({ style, compact = false }: StripeSetupBannerProps) {
  const { user } = useAuth();
  const driverId = useDriverId();
  const { data: connectStatus, isLoading: isStatusLoading, refetch: refetchConnect } = useConnectStatus(driverId);
  const connectOnboard = useConnectOnboard();
  const [loading, setLoading] = useState(false);

  if (!driverId || (isStatusLoading && !connectStatus)) return null;

  const isConnected = Boolean(connectStatus?.connected && connectStatus?.payoutsEnabled);
  const isPending = Boolean(connectStatus?.stripeAccountId && !connectStatus?.payoutsEnabled);

  if (isConnected) return null;

  const handleSetupPress = async () => {
    haptic('medium');
    setLoading(true);
    try {
      const res = await connectOnboard.mutateAsync({
        driverUserId: driverId,
        driverEmail: user?.email,
      });
      if (res?.url) {
        await openStripeOnboardingSession(res.url);
      }
      await refetchConnect();
    } catch (err: any) {
      const msg = err?.message || 'Could not start bank onboarding';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Onboarding Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const titleText = isPending ? 'Finish Bank Setup' : 'Bank Account Setup Required';
  const descriptionText = isPending
    ? 'Additional verification required to enable payouts for your deliveries.'
    : 'Connect your bank account via Stripe to receive payouts for completed orders.';
  const buttonText = isPending ? 'Finish Setup' : 'Set Up Payouts';

  return (
    <View style={[styles.container, isPending && styles.containerPending, style]}>
      <View style={styles.contentRow}>
        <View style={[styles.iconCircle, isPending && styles.iconCirclePending]}>
          {isPending ? (
            <AlertCircle size={20} color={AMBER_GOLD} />
          ) : (
            <CreditCard size={20} color={ELECTRIC_BLUE} />
          )}
        </View>

        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{titleText}</Text>
            <View style={[styles.badge, isPending ? styles.badgePending : styles.badgeSetup]}>
              <Text style={[styles.badgeText, isPending ? styles.badgeTextPending : styles.badgeTextSetup]}>
                {isPending ? 'ACTION NEEDED' : 'SETUP REQUIRED'}
              </Text>
            </View>
          </View>
          {!compact && <Text style={styles.subtitle}>{descriptionText}</Text>}
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSetupPress}
        disabled={loading || isStatusLoading}
        activeOpacity={0.85}
      >
        {loading || isStatusLoading ? (
          <ActivityIndicator size="small" color="#0F131C" />
        ) : (
          <>
            <Text style={styles.buttonText}>{buttonText}</Text>
            <ChevronRight size={16} color="#0F131C" style={{ marginLeft: 2 }} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141824',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.3)',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  containerPending: {
    borderColor: 'rgba(244, 195, 0, 0.45)',
    backgroundColor: '#191817',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 195, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCirclePending: {
    backgroundColor: 'rgba(244, 195, 0, 0.2)',
  },
  textColumn: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeSetup: {
    backgroundColor: 'rgba(244, 195, 0, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.35)',
  },
  badgePending: {
    backgroundColor: 'rgba(244, 195, 0, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.45)',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextSetup: {
    color: '#F4C300',
  },
  badgeTextPending: {
    color: '#F4C300',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 17,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFE399',
    shadowColor: '#FFE399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#0F131C',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
