import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  Clock,
  CheckCircle,
  Car,
  ShieldCheck,
  FileText,
  ArrowRight,
  Shield,
  Zap,
  LogOut,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing } from '@/constants/design';
import { useAuth } from '@/hooks/useAuth';
import { useMyVerification, useReviewVerification, useSubmitVerification } from '@/lib/verification';
import { DriverWizardData } from './mockData';

interface ReviewPendingStepProps {
  data: DriverWizardData;
  onDone?: () => void;
}

export function ReviewPendingStep({ data, onDone }: ReviewPendingStepProps) {
  const { user, logout } = useAuth();
  const { data: verification } = useMyVerification(user?.id);
  const reviewMutation = useReviewVerification();
  const submitMutation = useSubmitVerification();

  const isApproved = verification?.status === 'approved';

  const handleDevApprove = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    try {
      if (verification?.id) {
        await reviewMutation.mutateAsync({
          id: verification.id,
          status: 'approved',
        });
      } else {
        await submitMutation.mutateAsync({
          userId: user?.id || `usr-${Date.now()}`,
          driverName: user?.displayName || user?.email || 'Driver',
          driverEmail: user?.email,
          status: 'approved',
        });
      }
    } catch (err) {
      console.warn('[ReviewPendingStep] handleDevApprove error:', err);
    }
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 300);
  };

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    await logout();
    router.replace('/(landing)/role-select');
  };

  const handleGoDashboard = () => {
    if (onDone) {
      onDone();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.heroCard, isApproved && styles.heroCardApproved]}>
        <View style={[styles.iconCircle, isApproved && styles.iconCircleApproved]}>
          {isApproved ? (
            <CheckCircle size={36} color="#22C55E" />
          ) : (
            <Clock size={36} color="#FFE399" />
          )}
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, isApproved && styles.badgeApproved]}>
            <View style={[styles.pulsingDot, isApproved && styles.pulsingDotApproved]} />
            <Text style={[styles.badgeText, isApproved && styles.badgeTextApproved]}>
              {isApproved ? 'ACCREDITATION APPROVED' : 'UNDER ADMIN REVIEW'}
            </Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>
          {isApproved ? 'You Are Cleared to Drive!' : 'Verification Submitted!'}
        </Text>
        <Text style={styles.heroSubtitle}>
          {isApproved
            ? 'Your documents have been verified and approved. You can now access available delivery orders.'
            : 'We are currently reviewing your documents and profile details. We will shortly update and notify you once your accreditation is confirmed.'}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>SUBMISSION SUMMARY</Text>

        <View style={styles.summaryItem}>
          <View style={styles.summaryItemIconBg}>
            <Car size={16} color={colors.primary} />
          </View>
          <View style={styles.summaryItemContent}>
            <Text style={styles.summaryItemLabel}>Vehicle & Address</Text>
            <Text style={styles.summaryItemValue}>
              {data.vehicleYear} {data.vehicleMake} {data.vehicleModel} • {data.licensePlate}
            </Text>
            <Text style={styles.summaryItemSubtext}>
              {data.address}, {data.city}, {data.state} {data.zip}
            </Text>
          </View>
          <CheckCircle size={16} color="#22C55E" />
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryItem}>
          <View style={styles.summaryItemIconBg}>
            <ShieldCheck size={16} color={colors.primary} />
          </View>
          <View style={styles.summaryItemContent}>
            <Text style={styles.summaryItemLabel}>Driver's License</Text>
            <Text style={styles.summaryItemValue}>
              {data.licenseFullName} • {data.licenseState} #{data.licenseNumber}
            </Text>
            <Text style={styles.summaryItemSubtext}>Expires: {data.licenseExpDate}</Text>
          </View>
          <CheckCircle size={16} color="#22C55E" />
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryItem}>
          <View style={styles.summaryItemIconBg}>
            <Shield size={16} color="#FFE399" />
          </View>
          <View style={styles.summaryItemContent}>
            <Text style={styles.summaryItemLabel}>Background Check</Text>
            <Text style={styles.summaryItemValue}>SSN ending in •••• {data.ssnLast4}</Text>
            <Text style={styles.summaryItemSubtext}>FCRA Consent Authorized</Text>
          </View>
          <CheckCircle size={16} color="#22C55E" />
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryItem}>
          <View style={styles.summaryItemIconBg}>
            <FileText size={16} color={colors.primary} />
          </View>
          <View style={styles.summaryItemContent}>
            <Text style={styles.summaryItemLabel}>Vehicle Insurance</Text>
            <Text style={styles.summaryItemValue}>
              {data.insuranceCompany} • Policy #{data.policyNumber}
            </Text>
            <Text style={styles.summaryItemSubtext}>VIN: {data.vinNumber}</Text>
          </View>
          <CheckCircle size={16} color="#22C55E" />
        </View>
      </View>

      {isApproved ? (
        <Pressable onPress={handleGoDashboard} style={styles.doneBtn}>
          <Text style={styles.doneBtnText}>Enter Driver Dashboard</Text>
          <ArrowRight size={18} color={colors.onPrimaryContainer} />
        </Pressable>
      ) : (
        <View style={styles.actionButtonsCol}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleDevApprove}
            style={styles.devApproveBtn}
          >
            <Zap size={16} color="#0F131C" />
            <Text style={styles.devApproveBtnText}>⚡ Dev: Approve & Enter Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSignOut}
            style={styles.signOutBtn}
          >
            <LogOut size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.signOutBtnText}>Sign Out / Switch Role</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 227, 153, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.2)',
    gap: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 227, 153, 0.3)',
  },
  badgeRow: {
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 227, 153, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.35)',
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFE399',
  },
  badgeText: {
    color: '#FFE399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  summaryTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryItemIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItemContent: {
    flex: 1,
  },
  summaryItemLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  summaryItemValue: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  summaryItemSubtext: {
    fontSize: 11,
    color: colors.outline,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  doneBtn: {
    height: 52,
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  doneBtnText: {
    color: colors.onPrimaryContainer,
    fontSize: 15,
    fontWeight: '700',
  },
  heroCardApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  iconCircleApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  badgeApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  pulsingDotApproved: {
    backgroundColor: '#22C55E',
  },
  badgeTextApproved: {
    color: '#22C55E',
  },
  actionButtonsCol: {
    gap: 10,
    marginTop: 4,
  },
  devApproveBtn: {
    height: 52,
    backgroundColor: '#FFE399',
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  devApproveBtnText: {
    color: '#0F131C',
    fontSize: 14.5,
    fontWeight: '700',
  },
  signOutBtn: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  signOutBtnText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
  },
});
