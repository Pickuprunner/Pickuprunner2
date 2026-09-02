import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/design';
import {
  searchAddressSuggestions,
  geocode,
  getPlaceCoordinates,
  setCachedCoords,
  AddressSuggestion,
} from '@/lib/distance';
import { MapLocationPickerModal } from './MapLocationPickerModal';
import { CustomInput, useToast } from '@/components/core';
import { useLocationStore } from '@/store/useLocationStore';

const GOLD = '#FFE399';
const PRIMARY_BLUE = '#1E75FF';

interface AddressAutocompleteInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
  leftIcon?: React.ReactNode;
  status?: 'default' | 'success' | 'error';
  enableMapPicker?: boolean;
  nearbyAddress?: string;
}

export function AddressAutocompleteInput({
  label,
  placeholder = 'Enter address',
  value,
  onChangeText,
  editable = true,
  leftIcon,
  status = 'default',
  enableMapPicker = true,
  nearbyAddress,
}: AddressAutocompleteInputProps) {
  const { showToast } = useToast();
  const inputRef = useRef<TextInput>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingRef = useRef(false);

  const hasCachedCoords = useLocationStore((state) => {
    const key = value ? value.trim().toLowerCase() : '';
    return Boolean(key.length >= 5 && state.geocodeCache[key]);
  });

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const haptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handleTextChange = (text: string) => {
    onChangeText(text);

    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const cleanText = text.trim();

    if (!cleanText || cleanText.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      setLoadingSuggestions(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        let nearbyCoords: { lat: number; lon: number } | null = null;
        if (nearbyAddress && nearbyAddress.trim().length >= 3) {
          nearbyCoords = await geocode(nearbyAddress.trim());
        }
        const results = await searchAddressSuggestions(cleanText, 3, nearbyCoords);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);
  };

  const handleSelectSuggestion = async (item: AddressSuggestion) => {
    try {
      isSelectingRef.current = true;
      haptic();
      onChangeText(item.displayName);
      setSuggestions([]);
      setShowDropdown(false);

      if (item.placeId) {
        getPlaceCoordinates(item.placeId, item.displayName).catch(() => {});
      } else if (item.lat && item.lon) {
        setCachedCoords(item.displayName, { lat: item.lat, lon: item.lon });
      } else {
        geocode(item.displayName).catch(() => {});
      }
    } catch {}
  };

  return (
    <View style={[styles.container, showDropdown && { zIndex: 9999, elevation: 25 }]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>

        {editable && enableMapPicker && (
          <Pressable
            onPress={() => {
              haptic();
              setMapModalVisible(true);
            }}
            hitSlop={6}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="map" size={13} color={PRIMARY_BLUE} />
            <Text style={styles.actionBtnText}>Pin Map</Text>
          </Pressable>
        )}
      </View>

      <CustomInput
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChangeText={handleTextChange}
        editable={editable}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        leftIcon={leftIcon}
        status={hasCachedCoords ? 'success' : 'default'}
        loading={loadingSuggestions}
        focusBorderColor="#F4C300"
        focusGlowColor="rgba(244, 195, 0, 0.35)"
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            setShowDropdown(false);
            if (value && value.trim().length >= 5 && !useLocationStore.getState().getCachedCoords(value.trim())) {
              geocode(value.trim()).catch(() => {});
            }
          }, 250);
        }}
      />

      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdownContainer}>
          <ScrollView
            style={styles.dropdownScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {suggestions.slice(0, 3).map((item, index) => (
              <Pressable
                key={`${item.displayName}-${index}`}
                onPress={() => handleSelectSuggestion(item)}
                style={({ pressed }) => [
                  styles.suggestionItem,
                  index < Math.min(suggestions.length, 3) - 1 && styles.suggestionBorder,
                  pressed && styles.suggestionPressed,
                ]}
              >
                <View style={styles.suggestionIconCircle}>
                  <MaterialIcons name="place" size={16} color={GOLD} />
                </View>
                <View style={styles.suggestionTextCol}>
                  <Text style={styles.primaryText} numberOfLines={1}>
                    {item.primaryText}
                  </Text>
                  {item.secondaryText ? (
                    <Text style={styles.secondaryText} numberOfLines={1}>
                      {item.secondaryText}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <MapLocationPickerModal
        visible={mapModalVisible}
        onClose={() => setMapModalVisible(false)}
        initialAddress={value}
        title={`Pinpoint ${label.replace(' *', '')}`}
        onSelectAddress={(addr) => {
          isSelectingRef.current = true;
          onChangeText(addr);
          setSuggestions([]);
          setShowDropdown(false);
          showToast('Address Selected', {
            description: addr,
            type: 'success',
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: GOLD,
  },
  dropdownContainer: {
    marginTop: 6,
    backgroundColor: '#141926',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownScroll: {
    maxHeight: 165,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  suggestionPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  suggestionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 196, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextCol: {
    flex: 1,
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryText: {
    fontSize: 11,
    color: '#8C90A1',
    marginTop: 1,
  },
});
