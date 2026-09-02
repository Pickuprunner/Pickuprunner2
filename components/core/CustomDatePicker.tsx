import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing } from '@/constants/design';

export type DatePickerMode = 'birthdate' | 'future' | 'past' | 'effective' | 'any';

export interface CustomDatePickerProps {
  label?: string;
  value?: string; // Expects MM/DD/YYYY or YYYY-MM-DD or empty
  onChange: (formattedDate: string) => void;
  placeholder?: string;
  minDate?: Date | string;
  maxDate?: Date | string;
  mode?: DatePickerMode;
  error?: string | boolean;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<ViewStyle>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAY_NAMES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Parse standard date formats (MM/DD/YYYY, YYYY-MM-DD) into Date object safely */
function parseDateString(val?: string): Date | null {
  if (!val || typeof val !== 'string') return null;
  const clean = val.trim();
  if (!clean) return null;

  // Format: MM/DD/YYYY
  const mdy = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const m = parseInt(mdy[1], 10) - 1;
    const d = parseInt(mdy[2], 10);
    const y = parseInt(mdy[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime()) && date.getMonth() === m) return date;
  }

  // Format: YYYY-MM-DD
  const ymd = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const y = parseInt(ymd[1], 10);
    const m = parseInt(ymd[2], 10) - 1;
    const d = parseInt(ymd[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime()) && date.getMonth() === m) return date;
  }

  return null;
}

/** Format Date object as MM/DD/YYYY */
function formatDateToDisplay(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
}

export function CustomDatePicker({
  label,
  value = '',
  onChange,
  placeholder = 'MM/DD/YYYY',
  minDate,
  maxDate,
  mode = 'any',
  error,
  disabled = false,
  containerStyle,
  labelStyle,
  inputStyle,
}: CustomDatePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'years' | 'months'>('calendar');
  const yearScrollRef = useRef<ScrollView>(null);

  const selectedDate = useMemo(() => parseDateString(value), [value]);

  // Initial reference date for month/year navigation
  const defaultNavDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    const today = new Date();
    if (mode === 'birthdate') {
      return new Date(today.getFullYear() - 21, today.getMonth(), 1);
    }
    if (mode === 'future') {
      return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }
    return today;
  }, [selectedDate, mode]);

  const [navYear, setNavYear] = useState(defaultNavDate.getFullYear());
  const [navMonth, setNavMonth] = useState(defaultNavDate.getMonth());

  // Calculated boundaries
  const effectiveMinDate = useMemo(() => {
    if (minDate) return minDate instanceof Date ? minDate : parseDateString(minDate);
    const today = new Date();
    if (mode === 'future') {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return d;
    }
    if (mode === 'effective') {
      // Realistic: Active insurance starts at most 2 years ago (2024)
      return new Date(today.getFullYear() - 2, 0, 1);
    }
    if (mode === 'birthdate') {
      return new Date(today.getFullYear() - 85, 0, 1);
    }
    if (mode === 'past') {
      return new Date(today.getFullYear() - 30, 0, 1);
    }
    return new Date(today.getFullYear() - 5, 0, 1);
  }, [minDate, mode]);

  const effectiveMaxDate = useMemo(() => {
    if (maxDate) return maxDate instanceof Date ? maxDate : parseDateString(maxDate);
    const today = new Date();
    if (mode === 'past') {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      return d;
    }
    if (mode === 'birthdate') {
      const d = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate(), 23, 59, 59, 999);
      return d;
    }
    if (mode === 'effective') {
      // Realistic: Insurance policy starting at most 1 year ahead (2027)
      return new Date(today.getFullYear() + 1, 11, 31, 23, 59, 59, 999);
    }
    if (mode === 'future') {
      return new Date(today.getFullYear() + 10, 11, 31, 23, 59, 59, 999);
    }
    return new Date(today.getFullYear() + 5, 11, 31, 23, 59, 59, 999);
  }, [maxDate, mode]);

  const handleOpen = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    const current = selectedDate || defaultNavDate;
    setNavYear(current.getFullYear());
    setNavMonth(current.getMonth());
    setViewMode('calendar');
    setModalVisible(true);
  };

  const handleClose = () => {
    setModalVisible(false);
  };

  const handleSelectDay = (day: number) => {
    const chosen = new Date(navYear, navMonth, day);
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onChange(formatDateToDisplay(chosen));
    setModalVisible(false);
  };

  const handleClear = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onChange('');
    setModalVisible(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    if (effectiveMinDate && today < effectiveMinDate) return;
    if (effectiveMaxDate && today > effectiveMaxDate) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onChange(formatDateToDisplay(today));
    setModalVisible(false);
  };

  const handleDone = () => {
    if (viewMode === 'years') {
      setViewMode('calendar');
      return;
    }
    const day = selectedDate &&
      selectedDate.getMonth() === navMonth &&
      selectedDate.getFullYear() === navYear
        ? selectedDate.getDate()
        : 1;
    const chosen = new Date(navYear, navMonth, day);
    if (effectiveMinDate && chosen < effectiveMinDate) {
      setModalVisible(false);
      return;
    }
    if (effectiveMaxDate && chosen > effectiveMaxDate) {
      setModalVisible(false);
      return;
    }
    onChange(formatDateToDisplay(chosen));
    setModalVisible(false);
  };

  const canGoPrevMonth = useMemo(() => {
    if (!effectiveMinDate) return true;
    const minYear = effectiveMinDate.getFullYear();
    const minMonth = effectiveMinDate.getMonth();
    return navYear > minYear || (navYear === minYear && navMonth > minMonth);
  }, [navYear, navMonth, effectiveMinDate]);

  const canGoNextMonth = useMemo(() => {
    if (!effectiveMaxDate) return true;
    const maxYear = effectiveMaxDate.getFullYear();
    const maxMonth = effectiveMaxDate.getMonth();
    return navYear < maxYear || (navYear === maxYear && navMonth < maxMonth);
  }, [navYear, navMonth, effectiveMaxDate]);

  const prevMonth = () => {
    if (!canGoPrevMonth) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear((y) => y - 1);
    } else {
      setNavMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (!canGoNextMonth) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear((y) => y + 1);
    } else {
      setNavMonth((m) => m + 1);
    }
  };

  // Build the 42-cell calendar grid (6 weeks x 7 days)
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(navYear, navMonth, 1).getDay();
    const daysInCurrentMonth = new Date(navYear, navMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(navYear, navMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      dateObj: Date;
      isSelected: boolean;
      isToday: boolean;
      isDisabled: boolean;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Prev month overflow
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(navYear, navMonth - 1, d);
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateObj: prevDate,
        isSelected: false,
        isToday: false,
        isDisabled: true,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateObj = new Date(navYear, navMonth, d);
      dateObj.setHours(0, 0, 0, 0);

      const isSelected = !!selectedDate &&
        selectedDate.getFullYear() === navYear &&
        selectedDate.getMonth() === navMonth &&
        selectedDate.getDate() === d;

      const isToday = today.getFullYear() === navYear &&
        today.getMonth() === navMonth &&
        today.getDate() === d;

      let isDisabled = false;
      if (effectiveMinDate) {
        const minCopy = new Date(effectiveMinDate);
        minCopy.setHours(0, 0, 0, 0);
        if (dateObj < minCopy) isDisabled = true;
      }
      if (effectiveMaxDate) {
        const maxCopy = new Date(effectiveMaxDate);
        maxCopy.setHours(23, 59, 59, 999);
        if (dateObj > maxCopy) isDisabled = true;
      }

      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateObj,
        isSelected,
        isToday,
        isDisabled,
      });
    }

    // Next month overflow - always fill 42 cells (6 full weeks) for perfectly stable height
    const totalCells = 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(navYear, navMonth + 1, d);
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateObj: nextDate,
        isSelected: false,
        isToday: false,
        isDisabled: true,
      });
    }

    return days;
  }, [navYear, navMonth, selectedDate, effectiveMinDate, effectiveMaxDate]);

  // Year list for quick year jumping: chronological order (past on left -> future on right)
  const yearList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const minYear = effectiveMinDate ? effectiveMinDate.getFullYear() : currentYear - 10;
    const maxYear = effectiveMaxDate ? effectiveMaxDate.getFullYear() : currentYear + 10;
    const list: number[] = [];

    for (let y = minYear; y <= maxYear; y++) {
      list.push(y);
    }
    return list;
  }, [effectiveMinDate, effectiveMaxDate]);

  useEffect(() => {
    if (viewMode === 'years' && yearScrollRef.current) {
      const idx = yearList.indexOf(navYear);
      if (idx >= 0) {
        const offset = Math.max(0, idx * 78 - 120);
        setTimeout(() => {
          yearScrollRef.current?.scrollTo({ x: offset, animated: false });
        }, 50);
      }
    }
  }, [viewMode, navYear, yearList]);

  const displayValue = useMemo(() => {
    if (!value) return '';
    if (selectedDate) return formatDateToDisplay(selectedDate);
    return value;
  }, [value, selectedDate]);

  const hasError = !error ? false : true;

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
        </Text>
      )}

      {/* Trigger Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleOpen}
        disabled={disabled}
        style={[
          styles.inputBox,
          hasError && styles.inputBoxError,
          disabled && styles.inputBoxDisabled,
          inputStyle,
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={displayValue ? colors.primary : colors.outline}
          style={styles.leadingIcon}
        />

        <Text
          style={[
            styles.inputText,
            !displayValue && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {displayValue || placeholder}
        </Text>

        {displayValue ? (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={16} color={colors.outline} />
          </TouchableOpacity>
        ) : (
          <Feather name="chevron-down" size={16} color={colors.outline} />
        )}
      </TouchableOpacity>

      {/* Error Message */}
      {hasError && typeof error === 'string' && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={13} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Calendar Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {/* Header Navigation */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setViewMode(viewMode === 'calendar' ? 'years' : 'calendar')}
                    style={styles.monthYearTitleBtn}
                  >
                    <Text style={styles.monthYearTitleText}>
                      {MONTH_NAMES[navMonth]} {navYear}
                    </Text>
                    <Feather
                      name={viewMode === 'calendar' ? 'chevron-down' : 'chevron-up'}
                      size={16}
                      color={colors.primary}
                      style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>

                  {viewMode === 'calendar' && (
                    <View style={styles.navButtonsRow}>
                      <TouchableOpacity
                        activeOpacity={canGoPrevMonth ? 0.7 : 1}
                        onPress={prevMonth}
                        disabled={!canGoPrevMonth}
                        style={[styles.navArrowBtn, !canGoPrevMonth && styles.navArrowBtnDisabled]}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={18}
                          color={canGoPrevMonth ? colors.onSurface : 'rgba(255, 255, 255, 0.15)'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={canGoNextMonth ? 0.7 : 1}
                        onPress={nextMonth}
                        disabled={!canGoNextMonth}
                        style={[styles.navArrowBtn, !canGoNextMonth && styles.navArrowBtnDisabled]}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={canGoNextMonth ? colors.onSurface : 'rgba(255, 255, 255, 0.15)'}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* CALENDAR VIEW */}
                {viewMode === 'calendar' && (
                  <View style={styles.calendarContainer}>
                    {/* Weekday Headers */}
                    <View style={styles.weekdaysRow}>
                      {WEEKDAY_NAMES.map((wd) => (
                        <Text key={wd} style={styles.weekdayText}>
                          {wd}
                        </Text>
                      ))}
                    </View>

                    {/* Days Grid */}
                    <View style={styles.daysGrid}>
                      {calendarDays.map((cDay, idx) => {
                        if (!cDay.isCurrentMonth) {
                          return (
                            <View key={`empty-${idx}`} style={styles.dayCell} />
                          );
                        }

                        return (
                          <TouchableOpacity
                            key={`day-${cDay.dayNumber}`}
                            activeOpacity={cDay.isDisabled ? 1 : 0.6}
                            disabled={cDay.isDisabled}
                            onPress={() => handleSelectDay(cDay.dayNumber)}
                            style={[
                              styles.dayCell,
                              cDay.isSelected && styles.selectedDayCell,
                              cDay.isToday && !cDay.isSelected && styles.todayDayCell,
                              cDay.isDisabled && styles.disabledDayCell,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                cDay.isSelected && styles.selectedDayText,
                                cDay.isToday && !cDay.isSelected && styles.todayDayText,
                                cDay.isDisabled && styles.disabledDayText,
                              ]}
                            >
                              {cDay.dayNumber}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* QUICK YEAR & MONTH SELECTOR VIEW */}
                {viewMode === 'years' && (
                  <View style={styles.yearMonthPickerContainer}>
                    {/* Month selector tabs */}
                    <Text style={styles.subHeaderTitle}>SELECT MONTH</Text>
                    <View style={styles.monthGrid}>
                      {MONTH_NAMES_SHORT.map((mName, mIdx) => {
                        let isMonthDisabled = false;
                        if (effectiveMinDate) {
                          const minYear = effectiveMinDate.getFullYear();
                          const minMonth = effectiveMinDate.getMonth();
                          if (navYear < minYear || (navYear === minYear && mIdx < minMonth)) {
                            isMonthDisabled = true;
                          }
                        }
                        if (effectiveMaxDate) {
                          const maxYear = effectiveMaxDate.getFullYear();
                          const maxMonth = effectiveMaxDate.getMonth();
                          if (navYear > maxYear || (navYear === maxYear && mIdx > maxMonth)) {
                            isMonthDisabled = true;
                          }
                        }

                        return (
                          <TouchableOpacity
                            key={mName}
                            activeOpacity={isMonthDisabled ? 1 : 0.7}
                            disabled={isMonthDisabled}
                            onPress={() => {
                              setNavMonth(mIdx);
                              if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                            }}
                            style={[
                              styles.monthChip,
                              navMonth === mIdx && styles.monthChipActive,
                              isMonthDisabled && styles.monthChipDisabled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.monthChipText,
                                navMonth === mIdx && styles.monthChipTextActive,
                                isMonthDisabled && styles.monthChipTextDisabled,
                              ]}
                            >
                              {mName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Year scroll list - Horizontal */}
                    <Text style={[styles.subHeaderTitle, { marginTop: 16 }]}>SELECT YEAR</Text>
                    <ScrollView
                      ref={yearScrollRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.yearHorizontalScroll}
                      contentContainerStyle={styles.yearHorizontalContent}
                    >
                      {yearList.map((y) => (
                        <TouchableOpacity
                          key={y}
                          activeOpacity={0.7}
                          onPress={() => {
                            setNavYear(y);
                            if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                          }}
                          style={[
                            styles.yearPill,
                            navYear === y && styles.yearPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.yearPillText,
                              navYear === y && styles.yearPillTextActive,
                            ]}
                          >
                            {y}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Bottom Action Footer */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleClear}
                    style={styles.footerSecondaryBtn}
                  >
                    <Text style={styles.footerSecondaryBtnText}>Clear</Text>
                  </TouchableOpacity>

                  {mode !== 'birthdate' && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleSelectToday}
                      style={styles.footerSecondaryBtn}
                    >
                      <Text style={styles.footerSecondaryBtnText}>Today</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleDone}
                    style={styles.footerPrimaryBtn}
                  >
                    <Text style={styles.footerPrimaryBtnText}>
                      {viewMode === 'years' ? 'Select Day' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#181B25',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
  },
  inputBoxError: {
    borderColor: colors.error,
  },
  inputBoxDisabled: {
    opacity: 0.5,
  },
  leadingIcon: {
    marginRight: 10,
  },
  inputText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  placeholderText: {
    color: colors.outline,
  },
  clearBtn: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingLeft: 4,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.error,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#151822',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  monthYearTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  monthYearTitleText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Calendar View
  calendarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 336,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: 40,
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 0.8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
  },
  selectedDayCell: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  todayDayCell: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabledDayCell: {
    opacity: 0.25,
  },
  dayText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#DFE2EF',
  },
  selectedDayText: {
    color: '#002B75',
    fontWeight: '700',
  },
  todayDayText: {
    color: colors.primary,
    fontWeight: '700',
  },
  disabledDayText: {
    color: '#6B7280',
  },

  // Year & Month Selector
  yearMonthPickerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 336,
  },
  subHeaderTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.outline,
    marginBottom: 8,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  monthChip: {
    width: '23%',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  monthChipActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.2)',
    borderColor: colors.primary,
  },
  monthChipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  monthChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  navArrowBtnDisabled: {
    opacity: 0.2,
  },
  monthChipDisabled: {
    opacity: 0.25,
  },
  monthChipTextDisabled: {
    color: '#6B7280',
  },
  yearHorizontalScroll: {
    maxHeight: 50,
    marginTop: 4,
  },
  yearHorizontalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  yearPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  yearPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  yearPillText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  yearPillTextActive: {
    color: '#002B75',
    fontWeight: '700',
  },

  // Footer Actions
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  footerSecondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  footerSecondaryBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: colors.outline,
  },
  footerPrimaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  footerPrimaryBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#002B75',
  },
});
