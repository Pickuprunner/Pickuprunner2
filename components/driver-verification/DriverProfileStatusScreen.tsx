import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
import { useToast, CustomLoading, CustomRefreshControl } from '@/components/core';

import { isAccreditationFullyApproved } from '@/apis/accreditation';

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

  const rawLicenseStatus = String(profile?.licenseStatus || accreditation?.steps?.license || '');
  const rawInsuranceStatus = String(profile?.insuranceStatus || accreditation?.steps?.insurance || '');
  const rawBgStatus = String(profile?.backgroundStatus || accreditation?.steps?.backgroundCheck || '');
  const rawVehicleStatus = String((profile as any)?.vehicleStatus || (profile as any)?.vehicle_status || '');
  const rawAccredStatus = String(profile?.accreditationStatus || '');

  const hasVehicle = Boolean(profile?.vehicleMake && profile?.vehiclePlate);
  const hasLicense = Boolean(profile?.licenseNumber || profile?.licenseState);
  const hasConsent = Boolean(profile?.backgroundConsentAt);
  const hasInsurance = Boolean(profile?.insurancePolicyNumber || profile?.insuranceCompany);

  const vehicleStatus: 'approved' | 'rejected' | 'in_review' =
    rawAccredStatus === 'approved' || rawVehicleStatus === 'approved'
      ? 'approved'
      : rawAccredStatus === 'rejected' || rawVehicleStatus === 'rejected'
        ? 'rejected'
        : 'in_review';

  const licenseStatus: 'approved' | 'rejected' | 'in_review' =
    rawLicenseStatus === 'approved'
      ? 'approved'
      : rawLicenseStatus === 'rejected'
        ? 'rejected'
        : 'in_review';

  const bgStatus: 'approved' | 'rejected' | 'in_review' =
    rawBgStatus === 'approved'
      ? 'approved'
      : rawBgStatus === 'rejected'
        ? 'rejected'
        : 'in_review';

  const insuranceStatus: 'approved' | 'rejected' | 'in_review' =
    rawInsuranceStatus === 'approved'
      ? 'approved'
      : rawInsuranceStatus === 'rejected'
        ? 'rejected'
        : 'in_review';

  const isApproved =
    vehicleStatus === 'approved' &&
    licenseStatus === 'approved' &&
    bgStatus === 'approved' &&
    insuranceStatus === 'approved';

  const isAnyStepRejected =
    vehicleStatus === 'rejected' ||
    licenseStatus === 'rejected' ||
    bgStatus === 'rejected' ||
    insuranceStatus === 'rejected';

  const isSubmitted =
    Boolean(profile?.isSubmitted) ||
    rawAccredStatus === 'under_review' ||
    rawAccredStatus === 'approved' ||
    rawAccredStatus === 'in_progress' ||
    verification?.status === 'pending' ||
    verification?.status === 'approved';

  useEffect(() => {
    if (user?.role === 'driver' && isApproved) {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)');
    }
  }, [user?.role, isApproved]);

  const handleRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    setRefreshing(true);
    try {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 550));
      const [accredRes] = await Promise.all([refetchAccred(), refetchVerif(), minDelay]);
      const isNowFullyApproved = isAccreditationFullyApproved(accredRes.data);
      if (isNowFullyApproved) {
        showToast('Accreditation Approved! Welcome to PickupRunner.', 'success');
        if (router.canDismiss()) router.dismissAll();
        router.replace('/(tabs)');
      } else if (accredRes.data?.profile?.accreditationStatus === 'rejected') {
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

    if (isApproved) {
      showToast('Accreditation is already approved.', 'success');
      return;
    }

    // Backend locks accreditation when under review unless a specific item is rejected
    if (!isAnyStepRejected && rawAccredStatus === 'under_review') {
      showToast('Application is locked while under review by our compliance team.', 'info');
      return;
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
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
                  : vehicleStatus === 'approved'
                    ? hasVehicle
                      ? `${profile?.vehicleYear || ''} ${profile?.vehicleMake || ''} ${profile?.vehicleModel || ''} (${profile?.vehiclePlate || ''})`.trim()
                      : 'Vehicle details verified & approved'
                    : hasVehicle
                      ? `${profile?.vehicleYear || ''} ${profile?.vehicleMake || ''} (${profile?.vehiclePlate || ''}) • Under Review`.trim()
                      : 'Vehicle details submitted • Under Review'}
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
                      ? `${profile?.licenseState || 'AZ'} • #${'••••' + String(profile.licenseNumber).slice(-4)} (Under Review)`
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
                      ? 'FCRA Disclosure Authorized • Under Review'
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
                      ? `${profile.insuranceCompany} • Policy #${profile.insurancePolicyNumber || '••••'} (Under Review)`
                      : 'Policy document submitted • Under Review'}
              </Text>
            </View>
            {insuranceVisuals.badgeNode}
          </TouchableOpacity>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionsContainer}>
          {isAnyStepRejected ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleEditDocuments(1)}
              style={styles.primaryActionBtn}
            >
              <FileText size={18} color="#0F131C" />
              <Text style={styles.primaryActionBtnText}>Update Documentation</Text>
              <ArrowRight size={18} color="#0F131C" />
            </TouchableOpacity>
          ) : rawAccredStatus === 'under_review' ? (
            <View style={styles.lockedNoticeBox}>
              <Clock size={16} color="#FFE399" />
              <Text style={styles.lockedNoticeText}>
                Application locked during safety & compliance review
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleEditDocuments(1)}
              style={styles.primaryActionBtn}
            >
              <FileText size={18} color="#0F131C" />
              <Text style={styles.primaryActionBtnText}>Edit Application Details</Text>
              <ArrowRight size={18} color="#0F131C" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleRefresh}
            disabled={refreshing}
            style={rawAccredStatus === 'under_review' && !isAnyStepRejected ? styles.primaryActionBtn : styles.secondaryActionBtn}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={rawAccredStatus === 'under_review' && !isAnyStepRejected ? '#0F131C' : '#FFE399'} />
            ) : (
              <>
                <RefreshCw size={16} color={rawAccredStatus === 'under_review' && !isAnyStepRejected ? '#0F131C' : '#FFE399'} />
                <Text style={rawAccredStatus === 'under_review' && !isAnyStepRejected ? styles.primaryActionBtnText : styles.secondaryActionBtnText}>
                  Check Approval Status
                </Text>
              </>
            )}
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
  lockedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 227, 153, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
  },
  lockedNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFE399',
    textAlign: 'center',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFE399',
    height: 50,
    borderRadius: borderRadius.md,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F131C',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFE399',
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
