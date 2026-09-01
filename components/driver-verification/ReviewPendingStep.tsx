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
import { useDriverAccreditation } from '@/lib/accreditation';
import { useMyVerification } from '@/lib/verification';
import { isAccreditationFullyApproved } from '@/apis/accreditation';
import { DriverWizardData } from './mockData';

interface ReviewPendingStepProps {
  data: DriverWizardData;
  onDone?: () => void;
}

export function ReviewPendingStep({ data, onDone }: ReviewPendingStepProps) {
  const { user, logout } = useAuth();
  const { data: accreditation } = useDriverAccreditation();

  const { data: verification } = useMyVerification(user?.id);

  const isApproved = isAccreditationFullyApproved(accreditation);

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    await logout();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/(landing)/role-select');
  };

  const handleGoDashboard = () => {
    if (onDone) {
      onDone();
    } else {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)');
    }
  };

  const profile = accreditation?.profile;

  return (
    <View style={styles.container}>
      <View style={[styles.heroCard, isApproved && styles.heroCardApproved]}>
        <View style={styles.iconWrapper}>
          {isApproved ? (
            <CheckCircle size={52} color="#22C55E" />
          ) : (
            <Clock size={52} color="#FFE399" />
          )}
        </View>

        <View style={styles.badgeRow}>
          <Text style={[styles.badgeText, isApproved && styles.badgeTextApproved]}>
            {isApproved ? 'ACCREDITATION APPROVED' : 'UNDER REVIEW'}
          </Text>
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
              {profile?.vehicleYear || data.vehicleYear} {profile?.vehicleMake || data.vehicleMake} {profile?.vehicleModel || data.vehicleModel} • {profile?.vehiclePlate || data.licensePlate}
            </Text>
            <Text style={styles.summaryItemSubtext}>
              {profile?.streetAddress || data.address}, {profile?.city || data.city}, {profile?.state || data.state} {profile?.postalCode || data.zip}
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
              {profile?.legalName || data.licenseFullName} • {profile?.licenseState || data.licenseState} #{profile?.licenseNumber || data.licenseNumber}
            </Text>
            <Text style={styles.summaryItemSubtext}>
              Expires: {profile?.licenseExpirationDate || data.licenseExpDate}
            </Text>
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
            <Text style={styles.summaryItemValue}>
              Status: {profile?.backgroundStatus === 'approved' ? 'Approved' : 'In Review'}
            </Text>
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
              {profile?.insuranceCompany || data.insuranceCompany} • Policy #{profile?.insurancePolicyNumber || data.policyNumber}
            </Text>
            <Text style={styles.summaryItemSubtext}>
              VIN: {profile?.vehicleVin || data.vinNumber}
            </Text>
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
            onPress={handleSignOut}
            style={styles.signOutBtn}
          >
            <LogOut size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
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
  heroCardApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  badgeRow: {
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFE399',
    letterSpacing: 1,
  },
  badgeTextApproved: {
    color: '#22C55E',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryItemIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItemContent: {
    flex: 1,
  },
  summaryItemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  summaryItemValue: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  summaryItemSubtext: {
    fontSize: 10,
    color: colors.outline,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryContainer,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    marginTop: 4,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
  },
  actionButtonsCol: {
    gap: 10,
    marginTop: 4,
  },
  devApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFE399',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
  },
  devApproveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F131C',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
});
