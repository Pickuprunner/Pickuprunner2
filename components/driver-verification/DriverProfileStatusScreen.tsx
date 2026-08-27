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
  const isApproved = profile?.accreditationStatus === 'approved' || verification?.status === 'approved';

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

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    await logout();
    router.replace('/(landing)/role-select');
  };

  const isChecking = isFetchingAccred || isFetchingVerif || refreshing;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xl },
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
            <View style={styles.iconCircle}>
              <Clock size={44} color="#FFE399" />
            </View>
          </View>

          <View style={styles.statusPill}>
            <View style={styles.pulsingDot} />
            <Text style={styles.statusPillText}>UNDER REVIEW</Text>
          </View>

          <Text style={styles.title}>See you Shortly</Text>
          <Text style={styles.subtitle}>
            Once your profile has been reviewed, come back here to start accepting and fulfilling local deliveries.
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
                {profile?.vehicleYear ? `${profile.vehicleYear} ` : ''}
                {profile?.vehicleMake || 'Vehicle'} {profile?.vehicleModel || ''}
                {profile?.vehiclePlate ? ` • ${profile.vehiclePlate}` : ''}
              </Text>
            </View>
            <CheckCircle size={16} color="#22C55E" />
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.iconBadge}>
              <ShieldCheck size={16} color={colors.primary} />
            </View>
            <View style={styles.summaryTextCol}>
              <Text style={styles.summaryLabel}>Driver's License</Text>
              <Text style={styles.summaryVal}>
                {profile?.legalName || user?.displayName || 'Driver'} • {profile?.licenseState || 'State'} #{profile?.licenseNumber || '••••'}
              </Text>
            </View>
            <CheckCircle size={16} color="#22C55E" />
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.iconBadge}>
              <Shield size={16} color="#FFE399" />
            </View>
            <View style={styles.summaryTextCol}>
              <Text style={styles.summaryLabel}>Background Check</Text>
              <Text style={styles.summaryVal}>FCRA Consent Authorized</Text>
            </View>
            <CheckCircle size={16} color="#22C55E" />
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.iconBadge}>
              <FileText size={16} color={colors.primary} />
            </View>
            <View style={styles.summaryTextCol}>
              <Text style={styles.summaryLabel}>Vehicle Insurance</Text>
              <Text style={styles.summaryVal}>
                {profile?.insuranceCompany || 'Insurance Card'} • Policy #{profile?.insurancePolicyNumber || '••••'}
              </Text>
            </View>
            <CheckCircle size={16} color="#22C55E" />
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionsContainer}>
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
            activeOpacity={0.8}
            onPress={handleSignOut}
            style={styles.signOutBtn}
          >
            <LogOut size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.signOutBtnText}>Sign Out / Switch Role</Text>
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
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  iconGlowWrapper: {
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 227, 153, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 227, 153, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 227, 153, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.25)',
    marginBottom: spacing.sm,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFE399',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFE399',
    letterSpacing: 0.8,
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
