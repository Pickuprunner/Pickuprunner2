import React, { useState, useEffect } from 'react';
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
  X,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '@/constants/design';
import { useAuth } from '@/hooks/useAuth';
import { useDriverAccreditation } from '@/lib/accreditation';
import { useMyVerification } from '@/lib/verification';
import { useToast, CustomLoading } from '@/components/core';

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

  useEffect(() => {
    if (user?.role === 'driver' && isApproved) {
      router.replace('/(tabs)');
    }
  }, [user?.role, isApproved]);

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
      const minDelay = new Promise((resolve) => setTimeout(resolve, 550));
      const [accredRes] = await Promise.all([refetchAccred(), refetchVerif(), minDelay]);
      const newStatus = accredRes.data?.profile?.accreditationStatus;
      if (newStatus === 'approved') {
        showToast('Accreditation Approved! Welcome to PickupRunner.', 'success');
        router.replace('/(tabs)');
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

  const getItemVisuals = (hasData: boolean, itemStatus?: string) => {
    if (!hasData) {
      return {
        iconColor: colors.onSurfaceVariant,
        badgeNode: <Clock size={16} color={colors.onSurfaceVariant} />,
      };
    }
    if (isApproved || itemStatus === 'approved') {
      return {
        iconColor: '#22C55E',
        badgeNode: <CheckCircle size={16} color="#22C55E" />,
      };
    }
    if (itemStatus === 'rejected') {
      return {
        iconColor: '#EF4444',
        badgeNode: <X size={16} color="#EF4444" />,
      };
    }
    // Submitted and Under Review / Pending -> Amber Gold
    return {
      iconColor: '#FFE399',
      badgeNode: <Clock size={16} color="#FFE399" />,
    };
  };

  const vehicleVisuals = getItemVisuals(hasVehicle);
  const licenseVisuals = getItemVisuals(hasLicense, profile?.licenseStatus);
  const consentVisuals = getItemVisuals(hasConsent, profile?.backgroundStatus);
  const insuranceVisuals = getItemVisuals(hasInsurance, profile?.insuranceStatus);

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
            refreshing={false}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
            style={{ opacity: 0 }}
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

          <Text style={styles.heroTitle}>
            {isSubmitted ? 'Accreditation Under Review' : 'Accreditation In Progress'}
          </Text>

          <Text style={styles.heroSubtitle}>
            {isSubmitted
              ? 'Our safety compliance team is reviewing your vehicle details, driver license, background check, and insurance. Most reviews complete within 2–24 hours.'
              : 'Please complete all required steps to activate your driver account and start receiving delivery orders.'}
          </Text>
        </View>

        {/* CHECKLIST ITEMS */}
        <View style={styles.checklistCard}>
          <Text style={styles.checklistHeader}>VERIFICATION CHECKLIST</Text>

          {/* 1. Vehicle Info */}
          <View style={styles.checkItem}>
            <View style={styles.itemIconBox}>
              <Car size={20} color={vehicleVisuals.iconColor} />
            </View>
            <View style={styles.itemTextCol}>
              <Text style={styles.itemTitle}>Vehicle & Address</Text>
              <Text style={styles.itemSubtitle}>
                {hasVehicle
                  ? `${profile?.vehicleYear || ''} ${profile?.vehicleMake || ''} ${profile?.vehicleModel || ''} (${profile?.vehiclePlate || ''})`
                  : 'Incomplete'}
              </Text>
            </View>
            {vehicleVisuals.badgeNode}
          </View>

          <View style={styles.divider} />

          {/* 2. Driver License */}
          <View style={styles.checkItem}>
            <View style={styles.itemIconBox}>
              <ShieldCheck size={20} color={licenseVisuals.iconColor} />
            </View>
            <View style={styles.itemTextCol}>
              <Text style={styles.itemTitle}>Driver's License</Text>
              <Text style={styles.itemSubtitle}>
                {hasLicense
                  ? `${profile?.licenseState || 'AZ'} • #${profile?.licenseNumber ? '••••' + String(profile.licenseNumber).slice(-4) : '••••'}`
                  : 'Incomplete'}
              </Text>
            </View>
            {licenseVisuals.badgeNode}
          </View>

          <View style={styles.divider} />

          {/* 3. Background Check */}
          <View style={styles.checkItem}>
            <View style={styles.itemIconBox}>
              <FileText size={20} color={consentVisuals.iconColor} />
            </View>
            <View style={styles.itemTextCol}>
              <Text style={styles.itemTitle}>Background Check Consent</Text>
              <Text style={styles.itemSubtitle}>
                {hasConsent ? 'FCRA Disclosure Authorized' : 'Authorization Required'}
              </Text>
            </View>
            {consentVisuals.badgeNode}
          </View>

          <View style={styles.divider} />

          {/* 4. Insurance */}
          <View style={styles.checkItem}>
            <View style={styles.itemIconBox}>
              <Shield size={20} color={insuranceVisuals.iconColor} />
            </View>
            <View style={styles.itemTextCol}>
              <Text style={styles.itemTitle}>Vehicle Insurance Policy</Text>
              <Text style={styles.itemSubtitle}>
                {hasInsurance
                  ? `${profile?.insuranceCompany || 'Insurance'} • Policy #${profile?.insurancePolicyNumber || '••••'}`
                  : 'Incomplete'}
              </Text>
            </View>
            {insuranceVisuals.badgeNode}
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
      <CustomLoading visible={refreshing} variant="circle" overlay position="top" topOffset={insets.top + 24} />
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
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  checklistCard: {
    backgroundColor: '#191E2B',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: spacing.sm,
  },
  checklistHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  itemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 13,
    color: colors.onSurface,
    fontWeight: '600',
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
