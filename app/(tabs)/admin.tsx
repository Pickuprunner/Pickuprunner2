import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_CONFIG } from '@/lib/config';
import { useAllVerifications } from '@/lib/verification';
import { useAllBackgroundChecks } from '@/lib/backgroundCheck';
import { CustomHeader, CustomLoading, CustomRefreshControl } from '@/components/core';
import { useToast } from '@/components/core/CustomToast';
import {
  AdminOverviewPanel,
  AdminDocReviewPanel,
  AdminBGReviewPanel,
  AdminTabToggle,
  type AdminTab,
  type AdminDriverSummary,
} from '@/components/admin';
import { colors, gradients, spacing, borderRadius } from '@/constants/design';
import { useAuth } from '@/hooks/useAuth';

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { data: verifications = [], isLoading: loadingDocs, refetch: refetchDocs } = useAllVerifications();
  const { data: bgChecks = [], isLoading: loadingBG, refetch: refetchBG } = useAllBackgroundChecks();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setIsSearchFocused(false);
    });
    return () => hideSub.remove();
  }, []);

  if (user?.role !== 'admin') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <CustomHeader title="Admin Access" borderBottom onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <MaterialIcons name="lock" size={48} color="#EF4444" />
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 16 }}>Access Denied</Text>
          <Text style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
            This panel is restricted to administrative accounts only.
          </Text>
        </View>
      </View>
    );
  }

  const isSearching = isSearchFocused || searchQuery.trim().length > 0;

  const isLoading = loadingDocs || loadingBG;
  const refetch = async () => {
    await Promise.all([refetchDocs(), refetchBG()]);
    showToast('Compliance data refreshed', { type: 'success' });
  };

  // Document Stats (unfiltered for accurate overview indicators)
  const pendingDocs = verifications.filter((v) => v.status === 'pending').length;
  const approvedDocs = verifications.filter((v) => v.status === 'approved').length;
  const rejectedDocs = verifications.filter((v) => v.status === 'rejected').length;

  // Background Check Stats (unfiltered for accurate overview indicators)
  const pendingBG = bgChecks.filter((c) => c.status === 'pending' || c.status === 'in_review').length;
  const approvedBG = bgChecks.filter((c) => c.status === 'approved').length;
  const rejectedBG = bgChecks.filter((c) => c.status === 'rejected').length;

  const totalPending = pendingDocs + pendingBG;

  // Aggregate Unique Drivers Roster
  const driverMap = new Map<string, {
    name: string;
    email?: string;
    docStatus?: string;
    bgStatus?: string;
  }>();

  verifications.forEach((v) => {
    driverMap.set(v.user_id, { name: v.driver_name, email: v.driver_email, docStatus: v.status });
  });

  bgChecks.forEach((c) => {
    const existing = driverMap.get(c.user_id);
    if (existing) {
      existing.bgStatus = c.status;
    } else {
      driverMap.set(c.user_id, { name: c.driver_name, email: c.driver_email, bgStatus: c.status });
    }
  });

  const drivers: AdminDriverSummary[] = Array.from(driverMap.entries()).map(([uid, d]) => ({
    uid,
    ...d,
  }));

  // Live Filtered Datasets
  const q = searchQuery.trim().toLowerCase();
  const filteredDrivers = q
    ? drivers.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.email?.toLowerCase().includes(q) ||
          d.docStatus?.toLowerCase().includes(q) ||
          d.bgStatus?.toLowerCase().includes(q)
      )
    : drivers;

  const filteredVerifications = q
    ? verifications.filter(
        (v) =>
          v.driver_name.toLowerCase().includes(q) ||
          v.driver_email?.toLowerCase().includes(q) ||
          v.status.toLowerCase().includes(q) ||
          v.admin_note?.toLowerCase().includes(q)
      )
    : verifications;

  const filteredBGChecks = q
    ? bgChecks.filter(
        (c) =>
          c.driver_name.toLowerCase().includes(q) ||
          c.driver_email?.toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q) ||
          c.admin_note?.toLowerCase().includes(q) ||
          c.external_ref?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.state?.toLowerCase().includes(q)
      )
    : bgChecks;

  const handleNavigateWithFilter = (tab: AdminTab, driverName: string) => {
    setSearchQuery(driverName);
    setActiveTab(tab);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Ambient Hero Glow */}
      <LinearGradient
        colors={gradients.heroGlow}
        locations={gradients.heroGlowLocations}
        style={[styles.heroGlow, { height: 320 + insets.top }]}
        pointerEvents="none"
      />

      {/* ── Custom Header with Integrated Search ── */}
      <CustomHeader
        title="Admin Panel"
        subtitle="Driver Review & Compliance"
        subtitleHighlight={`${APP_CONFIG.APP_NAME} •`}
        variant="transparent"
        showBack
        backBtnVariant="plain"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/orders'))}
        backIcon={<MaterialIcons name="chevron-left" size={28} color={colors.onSurface} />}
        showSearch
        search={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchFocus={() => setIsSearchFocused(true)}
        onSearchBlur={() => setIsSearchFocused(false)}
        searchPlaceholder="Search drivers, emails, case IDs..."
        showAvatar={false}
        borderBottom
        rightContent={
          totalPending > 0 ? (
            <View style={styles.alertBadge}>
              <MaterialIcons name="notifications-active" size={13} color={colors.primary} />
              <Text style={styles.alertBadgeText}>{totalPending} PENDING</Text>
            </View>
          ) : undefined
        }
      />

      {/* ── Main Content Scroll ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<CustomRefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 },
        ]}
      >
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <AdminTabToggle
            value={activeTab}
            onChange={setActiveTab}
            pendingDocs={pendingDocs}
            pendingBG={pendingBG}
          />
        </View>

        {/* Tab Content */}
        {isLoading && verifications.length === 0 && bgChecks.length === 0 ? (
          <View style={styles.loadingContainer}>
            <CustomLoading size="large" variant="card" text="Loading compliance data…" />
          </View>
        ) : (
          <>
            {activeTab === 'overview' && (
              <AdminOverviewPanel
                pendingDocs={pendingDocs}
                approvedDocs={approvedDocs}
                rejectedDocs={rejectedDocs}
                pendingBG={pendingBG}
                approvedBG={approvedBG}
                rejectedBG={rejectedBG}
                drivers={filteredDrivers}
                onNavigateTab={setActiveTab}
                onNavigateWithFilter={handleNavigateWithFilter}
                isSearching={isSearching}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'docs' && (
              <AdminDocReviewPanel
                verifications={filteredVerifications}
                isSearching={isSearching}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'bgcheck' && (
              <AdminBGReviewPanel
                bgChecks={filteredBGChecks}
                isSearching={isSearching}
                searchQuery={searchQuery}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0E17',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  tabContainer: {
    marginBottom: spacing.xs,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.35)',
  },
  alertBadgeText: {
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});