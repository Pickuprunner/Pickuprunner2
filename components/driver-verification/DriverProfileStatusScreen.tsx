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

export interface DriverProfileStatusScreenProps {
  onEditDocuments?: () => void;
  onEditStep?: (step: number) => void;
}

export function DriverProfileStatusScreen({ onEditDocuments, onEditStep }: DriverProfileStatusScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: accreditation, refetch: refetchAccred, isFetching: isFetchingAccred } = useDriverAccreditation();
  const { data: verification, refetch: refetchVerif, isFetching: isFetchingVerif } = useMyVerification(user?.id);
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const profile = accreditation?.profile;
  const isApproved =
    profile?.accreditationStatus === 'approved' ||
    verification?.status === 'approved' ||
    accreditation?.eligibility?.eligible;

  const isSubmitted =
    Boolean(profile?.isSubmitted) ||
    profile?.accreditationStatus === 'under_review' ||
    profile?.accreditationStatus === 'approved' ||
    verification?.status === 'pending' ||
    verification?.status === 'approved';

  useEffect(() => {
    if (user?.role === 'driver' && isApproved) {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)');
    }
  }, [user?.role, isApproved]);

  const hasVehicle = Boolean(profile?.vehicleMake && profile?.vehiclePlate);
  const hasLicense = Boolean(profile?.licenseNumber || profile?.licenseState);
  const hasConsent = Boolean(profile?.backgroundConsentAt);
  const hasInsurance = Boolean(profile?.insurancePolicyNumber || profile?.insuranceCompany);

  const rawLicenseStatus = String(profile?.licenseStatus || accreditation?.steps?.license || '');
  const rawInsuranceStatus = String(profile?.insuranceStatus || accreditation?.steps?.insurance || '');
  const rawBgStatus = String(profile?.backgroundStatus || accreditation?.steps?.backgroundCheck || '');
  const rawVehicleStatus = String((profile as any)?.vehicleStatus || (profile as any)?.vehicle_status || '');

  const isOverallRejected =
    profile?.accreditationStatus === 'rejected' ||
    verification?.status === 'rejected';

  const licenseStatus: 'approved' | 'rejected' | 'in_review' =
    isApproved || rawLicenseStatus === 'approved'
      ? 'approved'
      : rawLicenseStatus === 'rejected' || (isOverallRejected && rawLicenseStatus !== 'approved')
        ? 'rejected'
        : 'in_review';

  const insuranceStatus: 'approved' | 'rejected' | 'in_review' =
    isApproved || rawInsuranceStatus === 'approved'
      ? 'approved'
      : rawInsuranceStatus === 'rejected' || (isOverallRejected && rawInsuranceStatus !== 'approved')
        ? 'rejected'
        : 'in_review';

  const bgStatus: 'approved' | 'rejected' | 'in_review' =
    isApproved || rawBgStatus === 'approved'
      ? 'approved'
      : rawBgStatus === 'rejected' || (isOverallRejected && rawBgStatus !== 'approved')
        ? 'rejected'
        : 'in_review';

  const vehicleStatus: 'approved' | 'rejected' | 'in_review' =
    rawVehicleStatus === 'rejected' || (isOverallRejected && rawVehicleStatus !== 'approved')
      ? 'rejected'
      : rawVehicleStatus === 'approved' || (isApproved && hasVehicle)
        ? 'approved'
        : isOverallRejected
          ? 'rejected'
          : 'in_review';

  const isAnyStepRejected =
    isOverallRejected ||
    licenseStatus === 'rejected' ||
    insuranceStatus === 'rejected' ||
    bgStatus === 'rejected' ||
    vehicleStatus === 'rejected';

  const handleRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    setRefreshing(true);
    try {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 550));
      const [accredRes] = await Promise.all([refetchAccred(), refetchVerif(), minDelay]);
      const newStatus = accredRes.data?.profile?.accreditationStatus;
      if (newStatus === 'approved') {
        showToast('Accreditation Approved! Welcome to PickupRunner.', 'success');
        if (router.canDismiss()) router.dismissAll();
        router.replace('/(tabs)');
      } else if (newStatus === 'rejected') {
        showToast('Application needs review. Please update documentation.', 'error');
      } else {
        showToast('Profile is still under review. We will notify you soon.', 'info');
      }
    } catch {
      showToast('Could not refresh status. Please try again.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditDocuments = (step: number = 1) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    if (onEditStep) {
      onEditStep(step);
    } else if (onEditDocuments) {
      onEditDocuments();
    } else {
      router.push({
        pathname: '/(auth)/driver-verification',
        params: { edit: 'true', step: String(step) },
      } as any);
    }
  };

  const isChecking = isFetchingAccred || isFetchingVerif || refreshing;

  const getItemVisuals = (status: 'approved' | 'rejected' | 'in_review') => {
    if (status === 'approved') {
      return {
        iconColor: '#22C55E',
        badgeNode: <CheckCircle size={16} color="#22C55E" />,
      };
    }
    if (status === 'rejected') {
      return {
        iconColor: '#EF4444',
        badgeNode: <X size={16} color="#EF4444" />,
      };
    }
    return {
      iconColor: '#FFE399',
      badgeNode: <Clock size={16} color="#FFE399" />,
    };
  };

  const vehicleVisuals = getItemVisuals(vehicleStatus);
  const licenseVisuals = getItemVisuals(licenseStatus);
  const consentVisuals = getItemVisuals(bgStatus);
  const insuranceVisuals = getItemVisuals(insuranceStatus);

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
          <View
            style={[
              styles.iconGlowWrapper,
              isApproved && styles.iconGlowWrapperApproved,
              isAnyStepRejected && styles.iconGlowWrapperRejected,
            ]}
          >
            {isApproved ? (
              <CheckCircle size={52} color="#22C55E" />
            ) : isAnyStepRejected ? (
              <X size={52} color="#EF4444" />
            ) : (
              <Clock size={52} color="#FFE399" />
            )}
          </View>

          <View
            style={[
              styles.statusPill,
              isApproved && styles.statusPillApproved,
              isAnyStepRejected && styles.statusPillRejected,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                isApproved && styles.statusPillTextApproved,
                isAnyStepRejected && styles.statusPillTextRejected,
              ]}
            >
              {isApproved
                ? 'APPROVED'
                : isAnyStepRejected
                  ? 'ACTION REQUIRED'
                  : isSubmitted
                    ? 'UNDER REVIEW'
                    : 'IN PROGRESS'}
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            {isApproved
              ? 'Accreditation Approved'
              : isAnyStepRejected
                ? 'Accreditation Action Required'
                : isSubmitted
                  ? 'Accreditation Under Review'
                  : 'Accreditation In Progress'}
          </Text>

          <Text style={styles.heroSubtitle}>
            {isApproved
              ? 'Your driver accreditation has been approved. You are ready to receive delivery orders.'
              : isAnyStepRejected
                ? profile?.rejectionReason ||
                'One or more verification steps require updated documentation. Please review the checklist below and tap to update your details.'
                : isSubmitted
                  ? 'Our safety compliance team is reviewing your vehicle details, driver license, background check, and insurance. Most reviews complete within 2–24 hours.'
                  : 'Please complete all required steps to activate your driver account and start receiving delivery orders.'}
          </Text>
        </View>

        {/* CHECKLIST ITEMS */}
        <View style={styles.checklistCard}>
          <View style={styles.checklistHeaderRow}>
            <Text style={styles.checklistHeader}>VERIFICATION CHECKLIST</Text>
            {isAnyStepRejected && (
              <Text style={styles.tapToEditHint}>Tap any item to edit</Text>
            )}
          </View>

          {/* 1. Vehicle Info */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleEditDocuments(1)}
            style={styles.checkItem}
          >
            <View style={styles.itemIconBox}>
              <Car size={20} color={vehicleVisuals.iconColor} />
            </View>
            <View style={styles.itemTextCol}>
              <Text style={styles.itemTitle}>Vehicle & Address</Text>
              <Text style={styles.itemSubtitle}>
                {vehicleStatus === 'rejected'
                  ? hasVehicle
                    ? `${profile?.vehicleYear || ''} ${profile?.vehicleMake || ''} (${profile?.vehiclePlate || ''}) • Action Required`
                    : 'Vehicle details rejected — Tap to update'
                  : hasVehicle
                    ? `${profile?.vehicleYear || ''} ${profile?.vehicleMake || ''} ${profile?.vehicleModel || ''} (${profile?.vehiclePlate || ''})`.trim()
                    : vehicleStatus === 'approved'
                      ? 'Vehicle details verified & approved'
                      : 'Vehicle details submitted'}
              </Text>
            </View>
            {vehicleVisuals.badgeNode}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* 2. Driver License */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleEditDocuments(2)}
            style={styles.checkItem}
          >
            <View style={styles.itemIconBox}>
              <ShieldCheck size={20} color={licenseVisuals.iconColor} />
            </View>
            <View style={styles.itemTextCol}>
              <Text style={styles.itemTitle}>Driver's License</Text>
              <Text style={styles.itemSubtitle}>
                {licenseStatus === 'approved'
                  ? profile?.licenseNumber
                    ? `${profile?.licenseState || 'AZ'} • #${profile.licenseNumber}`
                    : 'Driver License Verified & Approved'
                  : licenseStatus === 'rejected'
                    ? 'Action Required — Tap to re-upload license'
                    : profile?.licenseNumber
                      ? `${profile?.licenseState || 'AZ'} • #${'••••' + String(profile.licenseNumber).slice(-4)}`
                      : 'Document submitted • Under Review'}
              </Text>
            </View>
            {licenseVisuals.badgeNode}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* 3. Background Check */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleEditDocuments(3)}
            style={styles.checkItem}
          >
            <View style={styles.itemIconBox}>
              <FileText size={20} color={consentVisuals.iconColor} />
            </View>
            <View style={styles.itemTextCol}>
              <Text style={styles.itemTitle}>Background Check Consent</Text>
              <Text style={styles.itemSubtitle}>
                {bgStatus === 'approved'
                  ? 'FCRA Disclosure Authorized • Cleared'
                  : bgStatus === 'rejected'
                    ? 'Action Required — Tap to review consent'
                    : hasConsent
                      ? 'FCRA Disclosure Authorized'
                      : 'Authorization Required'}
              </Text>
            </View>
            {consentVisuals.badgeNode}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* 4. Insurance */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleEditDocuments(4)}
            style={styles.checkItem}
          >
            <View style={styles.itemIconBox}>
              <Shield size={20} color={insuranceVisuals.iconColor} />
            </View>
            <View style={styles.itemTextCol}>
              <Text style={styles.itemTitle}>Vehicle Insurance Policy</Text>
              <Text style={styles.itemSubtitle}>
                {insuranceStatus === 'approved'
                  ? profile?.insuranceCompany
                    ? `${profile.insuranceCompany} • Policy #${profile.insurancePolicyNumber || '••••'}`
                    : 'Insurance Policy Verified & Approved'
                  : insuranceStatus === 'rejected'
                    ? 'Action Required — Tap to update insurance'
                    : profile?.insuranceCompany
                      ? `${profile.insuranceCompany} • Policy #${profile.insurancePolicyNumber || '••••'}`
                      : 'Policy document submitted • Under Review'}
              </Text>
            </View>
            {insuranceVisuals.badgeNode}
          </TouchableOpacity>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionsContainer}>
          {isAnyStepRejected ? (
            <>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleEditDocuments(1)}
                style={styles.editBtn}
              >
                <FileText size={18} color="#0F131C" />
                <Text style={styles.editBtnText}>Update Documentation</Text>
                <ArrowRight size={18} color="#0F131C" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleRefresh}
                disabled={isChecking}
                style={styles.secondaryBtn}
              >
                {isChecking ? (
                  <ActivityIndicator size="small" color="#FFE399" />
                ) : (
                  <>
                    <RefreshCw size={16} color="#FFE399" />
                    <Text style={styles.secondaryBtnText}>Check Approval Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : !isSubmitted ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleEditDocuments(1)}
              style={styles.refreshBtn}
            >
              <ArrowRight size={16} color="#0F131C" />
              <Text style={styles.refreshBtnText}>Resume Application</Text>
            </TouchableOpacity>
          ) : (
            <>
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

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleEditDocuments(1)}
                style={styles.secondaryBtn}
              >
                <FileText size={16} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.secondaryBtnTextDim}>Edit Application Details</Text>
              </TouchableOpacity>
            </>
          )}
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
  statusPill: {
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.25)',
    backgroundColor: 'rgba(255, 227, 153, 0.1)',
  },
  statusPillApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  statusPillRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFE399',
    letterSpacing: 1,
  },
  statusPillTextApproved: {
    color: '#22C55E',
  },
  statusPillTextRejected: {
    color: '#EF4444',
  },
  iconGlowWrapper: {
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 227, 153, 0.08)',
  },
  iconGlowWrapperApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  iconGlowWrapperRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
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
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  checklistHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  tapToEditHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFE399',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFE399',
    height: 50,
    borderRadius: borderRadius.md,
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F131C',
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
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFE399',
  },
  secondaryBtnTextDim: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
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
