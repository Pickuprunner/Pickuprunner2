import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/constants/design';

export type DriverStatusFilter = 'all' | 'pending' | 'action_needed' | 'cleared';
export type DriverSortOption = 'priority' | 'name_asc' | 'name_desc';

export interface AdminFilterModalProps {
  visible: boolean;
  onClose: () => void;
  currentStatus: DriverStatusFilter;
  currentSort: DriverSortOption;
  onApply: (status: DriverStatusFilter, sort: DriverSortOption) => void;
  counts?: {
    all: number;
    pending: number;
    action_needed: number;
    cleared: number;
  };
}

export function AdminFilterModal({
  visible,
  onClose,
  currentStatus,
  currentSort,
  onApply,
  counts,
}: AdminFilterModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<DriverStatusFilter>(currentStatus);
  const [selectedSort, setSelectedSort] = useState<DriverSortOption>(currentSort);

  useEffect(() => {
    if (visible) {
      setSelectedStatus(currentStatus);
      setSelectedSort(currentSort);
    }
  }, [visible, currentStatus, currentSort]);

  const handleReset = () => {
    setSelectedStatus('all');
    setSelectedSort('priority');
  };

  const handleApply = () => {
    onApply(selectedStatus, selectedSort);
    onClose();
  };

  const statusOptions: { key: DriverStatusFilter; label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }[] = [
    { key: 'all', label: 'All Drivers', icon: 'group', color: colors.outline },
    { key: 'pending', label: 'Pending', icon: 'hourglass-top', color: '#FFE399' },
    { key: 'action_needed', label: 'Action Needed', icon: 'shield', color: '#FFB4AB' },
    { key: 'cleared', label: 'Cleared', icon: 'check-circle', color: '#00E297' },
  ];

  const sortOptions: {
    key: DriverSortOption;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  }[] = [
    { key: 'priority', label: 'Action Priority (Needs Review First)', icon: 'priority-high' },
    { key: 'name_asc', label: 'Driver Name (A → Z)', icon: 'arrow-upward' },
    { key: 'name_desc', label: 'Driver Name (Z → A)', icon: 'arrow-downward' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Top Handle Bar */}
              <View style={styles.dragHandle} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleGroup}>
                  <MaterialIcons name="tune" size={20} color={colors.primary} />
                  <Text style={styles.headerTitle}>Filter & Sort Drivers</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>

              {/* Filter Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Filter By Compliance Status</Text>
                <View style={styles.chipGrid}>
                  {statusOptions.map((option) => {
                    const isSelected = selectedStatus === option.key;
                    const count = counts ? counts[option.key] : undefined;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        activeOpacity={0.7}
                        onPress={() => setSelectedStatus(option.key)}
                        style={[
                          styles.statusChip,
                          isSelected && styles.statusChipActive,
                        ]}
                      >
                        <MaterialIcons
                          name={option.icon}
                          size={15}
                          color={isSelected ? colors.primary : option.color}
                        />
                        <Text
                          style={[
                            styles.statusChipText,
                            isSelected && styles.statusChipTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {count !== undefined && (
                          <View
                            style={[
                              styles.chipCountBadge,
                              isSelected && styles.chipCountBadgeActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipCountText,
                                isSelected && styles.chipCountTextActive,
                              ]}
                            >
                              {count}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Sort Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sort Order</Text>
                <View style={styles.sortList}>
                  {sortOptions.map((option) => {
                    const isSelected = selectedSort === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        activeOpacity={0.7}
                        onPress={() => setSelectedSort(option.key)}
                        style={[
                          styles.sortRow,
                          isSelected && styles.sortRowActive,
                        ]}
                      >
                        <View style={styles.sortRowLeft}>
                          <MaterialIcons
                            name={option.icon}
                            size={18}
                            color={isSelected ? colors.primary : colors.outline}
                          />
                          <Text
                            style={[
                              styles.sortRowText,
                              isSelected && styles.sortRowTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.radioOuter,
                            isSelected && styles.radioOuterActive,
                          ]}
                        >
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bottom Actions */}
              <View style={styles.footer}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleReset}
                  style={styles.resetBtn}
                >
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleApply}
                  style={styles.applyBtn}
                >
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0C0F17',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 25,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DFE2EF',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 4,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  statusChipActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.15)',
    borderColor: 'rgba(0, 102, 255, 0.45)',
  },
  statusChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  statusChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  chipCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  chipCountBadgeActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.25)',
  },
  chipCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
  },
  chipCountTextActive: {
    color: colors.primary,
  },
  sortList: {
    gap: 8,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  sortRowActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    borderColor: 'rgba(0, 102, 255, 0.35)',
  },
  sortRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sortRowText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  sortRowTextActive: {
    color: '#DFE2EF',
    fontWeight: '600',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  resetBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  applyBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0A0E17',
  },
});
