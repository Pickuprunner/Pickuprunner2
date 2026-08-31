import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock,
  CheckCircle,
  Car,
  ShieldCheck,
  FileText,
  Shield,
  LogOut,
  RefreshCw,
  ArrowRight,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '@/constants/design';
import { useAuth } from '@/hooks/useAuth';
import { useDriverAccreditation } from '@/lib/accreditation';
import { useMyVerification } from '@/lib/verification';
import { useToast } from '@/components/core';

export function DriverProfileStatusScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: accreditation, refetch: refetchAccred, isFetching: isFetchingAccred } = useDriverAccreditation();
  const { data: verification, refetch: refetchVerif, isFetching: isFetchingVerif } = useMyVerification(user?.id);
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const profile = accreditation?.profile;
  const isSubmitted =
    Boolean(profile?.isSubmitted) ||
    profile?.accreditationStatus === 'under_review' ||
    verification?.status === 'pending';
  const isApproved = profile?.accreditationStatus === 'approved' || verification?.status === 'approved';

  const hasVehicle = Boolean(profile?.vehicleMake && profile?.vehiclePlate);
  const hasLicense = Boolean(profile?.licenseNumber);
  const hasConsent = Boolean(profile?.backgroundConsentAt);
  const hasInsurance = Boolean(profile?.insurancePolicyNumber);

  const handleRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setRefreshing(true);
    try {
      const [accredRes] = await Promise.all([refetchAccred(), refetchVerif()]);
      const newStatus = accredRes.data?.profile?.accreditationStatus;
      if (newStatus === 'approved') {
        showToast('Accreditation Approved! Welcome to PickupRunner.', 'success');
      } else {
        showToast('Profile is still under review. We will notify you soon.', 'info');
      }
    } catch {
      showToast('Could not refresh status. Please try again.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleResume = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    router.push('/(auth)/driver-verification');
  };

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    await logout();
    router.replace('/(landing)/role-select');
  };

  const isChecking = isFetchingAccred || isFetchingVerif || refreshing;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* HERO ICON & STATUS */}
        <View style={styles.heroSection}>
          <View style={styles.iconGlowWrapper}>
            <Clock size={52} color="#FFE399" />
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {isSubmitted ? 'UNDER REVIEW' : 'IN PROGRESS'}
            </Text>
          </View>

          <Text style={styles.title}>
            {isSubmitted ? 'See you Shortly' : 'Finish Your Application'}
          </Text>
          <Text style={styles.subtitle}>
            {isSubmitted
              ? 'Once your profile has been reviewed, come back here to start accepting and fulfilling local deliveries.'
              : 'You have unfinished steps in your driver accreditation. Complete all steps to submit your profile for review.'}
          </Text>
        </View>

        {/* SUBMISSION DETAILS SUMMARY */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeader}>APPLICATION SUMMARY</Text>

          <View style={styles.summaryRow}>
            <View style={styles.iconBadge}>
              <Car size={16} color={colors.primary} />
            </View>
            <View style={styles.summaryTextCol}>
              <Text style={styles.summaryLabel}>Vehicle & Address</Text>
              <Text style={styles.summaryVal}>
                {hasVehicle
                  ? `${profile?.vehicleYear ? `${profile.vehicleYear} ` : ''}${profile?.vehicleMake} ${profile?.vehicleModel || ''} • ${profile?.vehiclePlate}`
                  : 'Incomplete'}
              </Text>
            </View>
            {hasVehicle ? (
              <CheckCircle size={16} color="#22C55E" />
            ) : (
              <Clock size={16} color="#FFE399" />
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.iconBadge}>
              <ShieldCheck size={16} color={colors.primary} />
            </View>
            <View style={styles.summaryTextCol}>
              <Text style={styles.summaryLabel}>Driver's License</Text>
              <Text style={styles.summaryVal}>
                {hasLicense
                  ? `${profile?.legalName || user?.displayName || 'Driver'} • ${profile?.licenseState || 'State'} #${profile?.licenseNumber || '••••'}`
                  : 'Incomplete'}
              </Text>
            </View>
            {hasLicense ? (
              <CheckCircle size={16} color="#22C55E" />
            ) : (
              <Clock size={16} color="#FFE399" />
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.iconBadge}>
              <Shield size={16} color="#FFE399" />
            </View>
            <View style={styles.summaryTextCol}>
              <Text style={styles.summaryLabel}>Background Check</Text>
              <Text style={styles.summaryVal}>
                {hasConsent ? 'FCRA Consent Authorized' : 'Consent Required'}
              </Text>
            </View>
            {hasConsent ? (
              <CheckCircle size={16} color="#22C55E" />
            ) : (
              <Clock size={16} color="#FFE399" />
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.iconBadge}>
              <FileText size={16} color={colors.primary} />
            </View>
            <View style={styles.summaryTextCol}>
              <Text style={styles.summaryLabel}>Vehicle Insurance</Text>
              <Text style={styles.summaryVal}>
                {hasInsurance
                  ? `${profile?.insuranceCompany || 'Insurance'} • Policy #${profile?.insurancePolicyNumber || '••••'}`
                  : 'Incomplete'}
              </Text>
            </View>
            {hasInsurance ? (
              <CheckCircle size={16} color="#22C55E" />
            ) : (
              <Clock size={16} color="#FFE399" />
            )}
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionsContainer}>
          {!isSubmitted ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleResume}
              style={styles.refreshBtn}
            >
              <ArrowRight size={16} color="#0F131C" />
              <Text style={styles.refreshBtnText}>Resume Application</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRefresh}
              disabled={isChecking}
              style={styles.refreshBtn}
            >
              {isChecking ? (
                <ActivityIndicator size="small" color="#0F131C" />
              ) : (
                <>
                  <RefreshCw size={16} color="#0F131C" />
                  <Text style={styles.refreshBtnText}>Check Approval Status</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSignOut}
            style={styles.signOutBtn}
          >
            <LogOut size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.gutter,
    gap: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  iconGlowWrapper: {
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFE399',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  summaryCard: {
    backgroundColor: '#191E2B',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: spacing.sm,
  },
  summaryHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  summaryVal: {
    fontSize: 13,
    color: colors.onSurface,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  actionsContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFE399',
    height: 48,
    borderRadius: borderRadius.md,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F131C',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
});
