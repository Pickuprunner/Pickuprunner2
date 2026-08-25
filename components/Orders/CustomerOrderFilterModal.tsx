import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export type CustomerOrderStatusFilter =
  | 'all'
  | 'pending'
  | 'active'
  | 'delivered'
  | 'cancelled';

export type CustomerDateFilter = 'all' | 'today' | 'week' | 'month';

export type CustomerSortOption = 'newest' | 'oldest';

export interface CustomerFilterState {
  status: CustomerOrderStatusFilter;
  dateRange: CustomerDateFilter;
  sortBy: CustomerSortOption;
}

export interface CustomerOrderFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: CustomerFilterState;
  onApply: (filters: CustomerFilterState) => void;
  counts?: {
    all: number;
    pending: number;
    active: number;
    delivered: number;
    cancelled: number;
  };
}

export function CustomerOrderFilterModal({
  visible,
  onClose,
  filters,
  onApply,
  counts,
}: CustomerOrderFilterModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<CustomerOrderStatusFilter>(
    filters.status
  );
  const [selectedDate, setSelectedDate] = useState<CustomerDateFilter>(
    filters.dateRange
  );
  const [selectedSort, setSelectedSort] = useState<CustomerSortOption>(
    filters.sortBy
  );
  const slideAnim = useRef(new Animated.Value(450)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSelectedStatus(filters.status);
      setSelectedDate(filters.dateRange);
      setSelectedSort(filters.sortBy);
      slideAnim.setValue(450);
      backdropAnim.setValue(0);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 220,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, filters]);

  const closeWithAnimation = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 450,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) {
        callback();
      }
      onClose();
    });
  };

  const haptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handleReset = () => {
    haptic();
    setSelectedStatus('all');
    setSelectedDate('all');
    setSelectedSort('newest');
  };

  const handleApply = () => {
    haptic();
    closeWithAnimation(() => {
      onApply({
        status: selectedStatus,
        dateRange: selectedDate,
        sortBy: selectedSort,
      });
    });
  };

  const statusOptions: {
    key: CustomerOrderStatusFilter;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    color: string;
  }[] = [
    { key: 'all', label: 'All Orders', icon: 'format-list-bulleted', color: '#dfe2ef' },
    { key: 'pending', label: 'Pending', icon: 'hourglass-top', color: '#FFE399' },
    { key: 'active', label: 'In Progress', icon: 'local-shipping', color: '#60A5FA' },
    { key: 'delivered', label: 'Delivered', icon: 'check-circle', color: '#00E297' },
    { key: 'cancelled', label: 'Cancelled', icon: 'cancel', color: '#FFB4AB' },
  ];

  const dateOptions: {
    key: CustomerDateFilter;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  }[] = [
    { key: 'all', label: 'All Time', icon: 'all-inclusive' },
    { key: 'today', label: 'Today', icon: 'today' },
    { key: 'week', label: 'Past 7 Days', icon: 'date-range' },
    { key: 'month', label: 'Past 30 Days', icon: 'calendar-month' },
  ];

  const sortOptions: {
    key: CustomerSortOption;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  }[] = [
    { key: 'newest', label: 'Newest First', icon: 'schedule' },
    { key: 'oldest', label: 'Oldest First', icon: 'history' },
  ];

  const hasActiveFilters =
    selectedStatus !== 'all' ||
    selectedDate !== 'all' ||
    selectedSort !== 'newest';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => closeWithAnimation()}
    >
      <TouchableWithoutFeedback onPress={() => closeWithAnimation()}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheetContainer,
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={styles.dragHandle} />

              <View style={styles.header}>
                <View style={styles.headerTitleGroup}>
                  <View style={styles.filterIconCircle}>
                    <MaterialIcons name="tune" size={18} color="#0F131C" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Filter & Sort Orders</Text>
                    <Text style={styles.headerSubtitle}>
                      Refine your pickup requests
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => closeWithAnimation()}
                  hitSlop={12}
                  style={styles.closeBtn}
                >
                  <MaterialIcons name="close" size={20} color="#8C90A1" />
                </Pressable>
              </View>

              <ScrollView
                style={styles.scrollBody}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>ORDER STATUS</Text>
                  <View style={styles.chipGrid}>
                    {statusOptions.map((option) => {
                      const isSelected = selectedStatus === option.key;
                      const count = counts ? counts[option.key] : undefined;
                      return (
                        <TouchableOpacity
                          key={option.key}
                          activeOpacity={0.7}
                          onPress={() => {
                            haptic();
                            setSelectedStatus(option.key);
                          }}
                          style={[
                            styles.chip,
                            isSelected && styles.chipActive,
                          ]}
                        >
                          <MaterialIcons
                            name={option.icon}
                            size={16}
                            color={isSelected ? '#ffe399' : option.color}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                          {count !== undefined && (
                            <View
                              style={[
                                styles.countBadge,
                                isSelected && styles.countBadgeActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.countBadgeText,
                                  isSelected && styles.countBadgeTextActive,
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

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>DATE RANGE</Text>
                  <View style={styles.chipGrid}>
                    {dateOptions.map((option) => {
                      const isSelected = selectedDate === option.key;
                      return (
                        <TouchableOpacity
                          key={option.key}
                          activeOpacity={0.7}
                          onPress={() => {
                            haptic();
                            setSelectedDate(option.key);
                          }}
                          style={[
                            styles.chip,
                            isSelected && styles.chipActive,
                          ]}
                        >
                          <MaterialIcons
                            name={option.icon}
                            size={16}
                            color={isSelected ? '#ffe399' : '#8C90A1'}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>SORT BY</Text>
                  <View style={styles.chipGrid}>
                    {sortOptions.map((option) => {
                      const isSelected = selectedSort === option.key;
                      return (
                        <TouchableOpacity
                          key={option.key}
                          activeOpacity={0.7}
                          onPress={() => {
                            haptic();
                            setSelectedSort(option.key);
                          }}
                          style={[
                            styles.chip,
                            isSelected && styles.chipActive,
                          ]}
                        >
                          <MaterialIcons
                            name={option.icon}
                            size={16}
                            color={isSelected ? '#ffe399' : '#8C90A1'}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleReset}
                  style={[
                    styles.resetBtn,
                    !hasActiveFilters && styles.resetBtnDisabled,
                  ]}
                  disabled={!hasActiveFilters}
                >
                  <MaterialIcons
                    name="refresh"
                    size={18}
                    color={hasActiveFilters ? '#8C90A1' : '#4E5365'}
                  />
                  <Text
                    style={[
                      styles.resetBtnText,
                      !hasActiveFilters && styles.resetBtnTextDisabled,
                    ]}
                  >
                    Reset All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleApply}
                  style={styles.applyBtn}
                >
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                  <MaterialIcons name="check" size={18} color="#0F131C" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#131824',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1.2,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 227, 153, 0.35)',
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#FFE399',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 227, 153, 0.35)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ffe399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#dfe2ef',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8C90A1',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 22,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C90A1',
    letterSpacing: 1.2,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  chipActive: {
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    borderColor: '#ffe399',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8C90A1',
  },
  chipTextActive: {
    color: '#ffe399',
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 227, 153, 0.25)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C90A1',
  },
  countBadgeTextActive: {
    color: '#ffe399',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  resetBtnDisabled: {
    opacity: 0.5,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8C90A1',
  },
  resetBtnTextDisabled: {
    color: '#4E5365',
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffe399',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#ffe399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F131C',
    letterSpacing: 0.3,
  },
});
