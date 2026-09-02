import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing } from '@/constants/design';
import { US_STATES_DATA, USState } from '@/components/driver-verification/mockData';

export interface CustomStatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedState: string;
  onSelect: (stateCode: string) => void;
  title?: string;
}

export function CustomStatePickerModal({
  visible,
  onClose,
  selectedState,
  onSelect,
  title = 'Select State',
}: CustomStatePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return US_STATES_DATA;
    return US_STATES_DATA.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelect = (code: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onSelect(code);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.avoidingView}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.titleRow}>
                    <View style={styles.iconBadge}>
                      <Feather name="map-pin" size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.modalTitle}>{title}</Text>
                  </View>
                  <TouchableOpacity
                    hitSlop={12}
                    activeOpacity={0.7}
                    onPress={handleClose}
                    style={styles.closeBtn}
                  >
                    <Feather name="x" size={18} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <Feather name="search" size={16} color={colors.outline} style={styles.searchIcon} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search state name or code..."
                    placeholderTextColor="#6B7280"
                    style={styles.searchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && Platform.OS !== 'ios' && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      hitSlop={8}
                      style={styles.clearSearchBtn}
                    >
                      <Feather name="x-circle" size={14} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* States List */}
                <FlatList
                  data={filteredStates}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                      <Feather name="alert-circle" size={24} color="#6B7280" />
                      <Text style={styles.emptyText}>No state found for "{searchQuery}"</Text>
                      <TouchableOpacity
                        onPress={() => setSearchQuery('')}
                        style={styles.resetSearchBtn}
                      >
                        <Text style={styles.resetSearchText}>Clear Search</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  renderItem={({ item }) => {
                    const isSelected = selectedState.toUpperCase() === item.code;
                    return (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleSelect(item.code)}
                        style={[
                          styles.stateRow,
                          isSelected && styles.stateRowActive,
                        ]}
                      >
                        <View style={styles.stateInfo}>
                          <View
                            style={[
                              styles.stateCodeBadge,
                              isSelected && styles.stateCodeBadgeActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.stateCodeText,
                                isSelected && styles.stateCodeTextActive,
                              ]}
                            >
                              {item.code}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.stateNameText,
                              isSelected && styles.stateNameTextActive,
                            ]}
                          >
                            {item.name}
                          </Text>
                        </View>

                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 13, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  avoidingView: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxHeight: 520,
    backgroundColor: '#181B25',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.25)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter',
    height: '100%',
  },
  clearSearchBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    marginVertical: 1,
  },
  stateRowActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
  },
  stateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stateCodeBadge: {
    width: 36,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stateCodeBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stateCodeText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  stateCodeTextActive: {
    color: '#002B75',
    fontWeight: '800',
  },
  stateNameText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#DFE2EF',
  },
  stateNameTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: '#8C90A1',
    fontSize: 13,
    textAlign: 'center',
  },
  resetSearchBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 102, 255, 0.15)',
  },
  resetSearchText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
