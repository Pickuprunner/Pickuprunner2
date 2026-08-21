import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AdminComplianceCard } from './AdminComplianceCard';
import { AdminDriverCard, type AdminDriverSummary } from './AdminDriverCard';
import {
  AdminFilterModal,
  type DriverStatusFilter,
  type DriverSortOption,
} from './AdminFilterModal';
import { AdminDriverDetailModal } from './AdminDriverDetailModal';
import { colors, spacing, borderRadius } from '@/constants/design';

export interface AdminOverviewPanelProps {
  pendingDocs: number;
  approvedDocs: number;
  rejectedDocs: number;
  pendingBG: number;
  approvedBG: number;
  rejectedBG: number;
  drivers: AdminDriverSummary[];
  onNavigateTab?: (tab: 'docs' | 'bgcheck') => void;
  onNavigateWithFilter?: (tab: 'docs' | 'bgcheck', driverName: string) => void;
  isSearching?: boolean;
  searchQuery?: string;
}

export function AdminOverviewPanel({
  pendingDocs,
  approvedDocs,
  rejectedDocs,
  pendingBG,
  approvedBG,
  rejectedBG,
  drivers,
  onNavigateTab,
  onNavigateWithFilter,
  isSearching = false,
  searchQuery = '',
}: AdminOverviewPanelProps) {
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilter>('all');
  const [sortBy, setSortBy] = useState<DriverSortOption>('priority');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<AdminDriverSummary | null>(null);

  // Status Counts
  const counts = useMemo(() => {
    const all = drivers.length;
    const pending = drivers.filter(
      (d) =>
        (d.docStatus === 'pending' || d.bgStatus === 'pending' || d.bgStatus === 'in_review') &&
        d.docStatus !== 'rejected' &&
        d.bgStatus !== 'rejected'
    ).length;
    const action_needed = drivers.filter(
      (d) => d.docStatus === 'rejected' || d.bgStatus === 'rejected'
    ).length;
    const cleared = drivers.filter(
      (d) => d.docStatus === 'approved' && d.bgStatus === 'approved'
    ).length;
    return { all, pending, action_needed, cleared };
  }, [drivers]);

  // Processed Drivers (Filter + Sort)
  const processedDrivers = useMemo(() => {
    let list = [...drivers];

    // Filter by status
    if (statusFilter === 'pending') {
      list = list.filter(
        (d) =>
          (d.docStatus === 'pending' || d.bgStatus === 'pending' || d.bgStatus === 'in_review') &&
          d.docStatus !== 'rejected' &&
          d.bgStatus !== 'rejected'
      );
    } else if (statusFilter === 'action_needed') {
      list = list.filter((d) => d.docStatus === 'rejected' || d.bgStatus === 'rejected');
    } else if (statusFilter === 'cleared') {
      list = list.filter((d) => d.docStatus === 'approved' && d.bgStatus === 'approved');
    }

    // Sort
    if (sortBy === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'priority') {
      const getPriority = (d: AdminDriverSummary) => {
        if (d.docStatus === 'rejected' || d.bgStatus === 'rejected') return 1;
        if (d.docStatus === 'pending' || d.bgStatus === 'pending' || d.bgStatus === 'in_review') return 2;
        return 3;
      };
      list.sort((a, b) => getPriority(a) - getPriority(b));
    }

    return list;
  }, [drivers, statusFilter, sortBy]);

  const isFilterActive = statusFilter !== 'all' || sortBy !== 'priority';

  return (
    <View style={styles.container}>
      {/* Show Compliance Cards ONLY when not searching */}
      {!isSearching && (
        <>
          {/* 1. Document Verifications Compliance Card */}
          <AdminComplianceCard
            title="Document Verifications"
            iconName="description"
            badgeText={pendingDocs > 0 ? `${pendingDocs} PENDING` : 'ALL RESOLVED'}
            badgeColor={pendingDocs > 0 ? '#FFE399' : '#00E297'}
            badgeBg={pendingDocs > 0 ? 'rgba(244, 195, 0, 0.12)' : 'rgba(0, 226, 151, 0.12)'}
            badgeBorder={pendingDocs > 0 ? 'rgba(244, 195, 0, 0.35)' : 'rgba(0, 226, 151, 0.35)'}
            highlightColor="rgba(244, 195, 0, 0.4)"
            stats={[
              { label: 'Pending', value: pendingDocs, color: '#FFE399', iconName: 'hourglass-top' },
              { label: 'Approved', value: approvedDocs, color: '#00E297', iconName: 'check-circle' },
              { label: 'Rejected', value: rejectedDocs, color: '#FFB4AB', iconName: 'cancel' },
            ]}
            actionText="Review Documents"
            onAction={() => onNavigateTab?.('docs')}
          />

          {/* 2. Background Checks Compliance Card */}
          <AdminComplianceCard
            title="Background Checks"
            iconName="fingerprint"
            badgeText={pendingBG > 0 ? `${pendingBG} IN REVIEW` : 'ALL RESOLVED'}
            badgeColor={pendingBG > 0 ? '#B3C5FF' : '#00E297'}
            badgeBg={pendingBG > 0 ? 'rgba(0, 102, 255, 0.15)' : 'rgba(0, 226, 151, 0.12)'}
            badgeBorder={pendingBG > 0 ? 'rgba(0, 102, 255, 0.35)' : 'rgba(0, 226, 151, 0.35)'}
            highlightColor="rgba(0, 102, 255, 0.4)"
            stats={[
              { label: 'In Review', value: pendingBG, color: '#B3C5FF', iconName: 'manage-search' },
              { label: 'Approved', value: approvedBG, color: '#00E297', iconName: 'check-circle' },
              { label: 'Rejected', value: rejectedBG, color: '#FFB4AB', iconName: 'cancel' },
            ]}
            actionText="Review Background Checks"
            onAction={() => onNavigateTab?.('bgcheck')}
          />
        </>
      )}

      {/* 3. Driver Roster / Search Results List */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.titleLeftGroup}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{processedDrivers.length}</Text>
            </View>
            <Text style={[styles.sectionTitle, isSearching && { color: colors.primary }]}>
              {isSearching ? 'SEARCH RESULTS' : 'ALL REGISTERED DRIVERS'}
            </Text>
          </View>

          {/* Filter & Sort Trigger Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowFilterModal(true)}
            style={[
              styles.filterTriggerBtn,
              isFilterActive && styles.filterTriggerBtnActive,
            ]}
          >
            <MaterialIcons
              name="tune"
              size={13}
              color={isFilterActive ? colors.primary : colors.outline}
            />
            <Text
              style={[
                styles.filterTriggerText,
                isFilterActive && styles.filterTriggerTextActive,
              ]}
            >
              {statusFilter !== 'all'
                ? statusFilter.replace('_', ' ').toUpperCase()
                : 'SORT & FILTER'}
            </Text>
            <MaterialIcons
              name="expand-more"
              size={14}
              color={isFilterActive ? colors.primary : colors.outline}
            />
          </TouchableOpacity>
        </View>

        {processedDrivers.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons
              name={isSearching ? 'search-off' : 'filter-list-off'}
              size={36}
              color={colors.outline}
              style={{ opacity: 0.5 }}
            />
            <Text style={styles.emptyText}>
              {isSearching
                ? `No drivers matching "${searchQuery}"`
                : 'No drivers match the selected filter.'}
            </Text>
            {isFilterActive && !isSearching && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setStatusFilter('all');
                  setSortBy('priority');
                }}
                style={styles.clearFilterBtn}
              >
                <Text style={styles.clearFilterBtnText}>Reset Filter</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.rosterList}>
            {processedDrivers.map((driver, index) => (
              <AdminDriverCard
                key={driver.uid}
                driver={driver}
                onPress={() => setSelectedDriver(driver)}
                isLast={index === processedDrivers.length - 1}
              />
            ))}
          </View>
        )}
      </View>

      {/* Filter & Sort Bottom Sheet Modal */}
      <AdminFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        currentStatus={statusFilter}
        currentSort={sortBy}
        onApply={(status, sort) => {
          setStatusFilter(status);
          setSortBy(sort);
        }}
        counts={counts}
      />

      {/* Driver Compliance Detail Sheet Modal */}
      <AdminDriverDetailModal
        visible={Boolean(selectedDriver)}
        driver={selectedDriver}
        onClose={() => setSelectedDriver(null)}
        onNavigateToDocs={(driverName) => {
          if (onNavigateWithFilter) {
            onNavigateWithFilter('docs', driverName);
          } else {
            onNavigateTab?.('docs');
          }
        }}
        onNavigateToBG={(driverName) => {
          if (onNavigateWithFilter) {
            onNavigateWithFilter('bgcheck', driverName);
          } else {
            onNavigateTab?.('bgcheck');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 4,
    marginBottom: 4,
  },
  titleLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.outline,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  filterTriggerBtnActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.15)',
    borderColor: 'rgba(0, 102, 255, 0.4)',
  },
  filterTriggerText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.4,
  },
  filterTriggerTextActive: {
    color: colors.primary,
  },
  rosterList: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyText: {
    fontSize: 13,
    color: colors.outline,
    textAlign: 'center',
  },
  clearFilterBtn: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
  },
  clearFilterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
