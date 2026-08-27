import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CustomInput } from '@/components/core';
import { colors } from '@/constants/design';

interface Props {
  search: string;
  onSearchChange: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  hasActiveFilter?: boolean;
  filterBadgeCount?: number;
  showFilter?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function OrdersSearchBar({
  search,
  onSearchChange,
  placeholder = 'Search by name, phone, address...',
  onFilterPress,
  hasActiveFilter = false,
  filterBadgeCount = 0,
  showFilter = true,
  containerStyle,
}: Props) {
  const handleFilter = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onFilterPress?.();
  };

  return (
    <View style={[styles.searchRow, containerStyle]}>
      <View style={styles.inputContainer}>
        <CustomInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={placeholder}
          placeholderTextColor="rgba(194, 198, 216, 0.5)"
          clearable
          onClear={() => onSearchChange('')}
          variant="rounded"
          leftIcon={
            <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} />
          }
          wrapperStyle={styles.customInputWrapper}
          inputStyle={styles.customInputField}
        />
      </View>

      {showFilter && onFilterPress ? (
        <Pressable
          onPress={handleFilter}
          accessibilityLabel="Filters"
          style={({ pressed }) => [
            styles.filterBtn,
            hasActiveFilter && styles.filterBtnActive,
            pressed && { opacity: 0.8 },
          ]}
        >
          <MaterialIcons
            name="tune"
            size={20}
            color={hasActiveFilter ? '#ffe399' : colors.onSurface}
          />
          {hasActiveFilter && filterBadgeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterBadgeCount}</Text>
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: 'rgba(15, 19, 28, 0.95)',
  },
  inputContainer: {
    flex: 1,
  },
  customInputWrapper: {
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  customInputField: {
    fontSize: 14,
    color: '#DFE2EF',
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: 'rgba(255, 227, 153, 0.14)',
    borderColor: '#ffe399',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffe399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F131C',
  },
});
