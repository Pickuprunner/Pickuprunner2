import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/design';
import { reverseGeocode, geocode, searchAddressSuggestions, AddressSuggestion } from '@/lib/distance';

let MapView: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
  } catch {}
}

const GOLD = '#FFE399';
const GREEN = '#00E297';
const PRIMARY_BLUE = '#1E75FF';

interface MapLocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAddress: (address: string) => void;
  initialAddress?: string;
  title?: string;
}

export function MapLocationPickerModal({
  visible,
  onClose,
  onSelectAddress,
  initialAddress = '',
  title = 'Pin Location on Map',
}: MapLocationPickerModalProps) {
  const mapRef = useRef<any>(null);
  const coordsRef = useRef<{ lat: number; lon: number }>({ lat: 21.1702, lon: 72.8311 });
  const [initialRegion, setInitialRegion] = useState({
    latitude: 21.1702,
    longitude: 72.8311,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });

  const [selectedAddress, setSelectedAddress] = useState(initialAddress);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;

    setSearchQuery('');
    setSearchSuggestions([]);
    setLoadingAddress(false);

    if (initialAddress.trim()) {
      setSelectedAddress(initialAddress);
      geocode(initialAddress).then((coords) => {
        if (coords) {
          coordsRef.current = coords;
          const target = {
            latitude: coords.lat,
            longitude: coords.lon,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          };
          setInitialRegion(target);
          setTimeout(() => {
            if (mapRef.current?.animateToRegion) {
              mapRef.current.animateToRegion(target, 450);
            }
          }, 200);
        } else {
          locateUser();
        }
      });
    } else {
      locateUser();
    }
  }, [visible, initialAddress]);

  const haptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const locateUser = async () => {
    try {
      setLocatingUser(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocatingUser(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      coordsRef.current = coords;

      const target = {
        latitude: coords.lat,
        longitude: coords.lon,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      };
      setInitialRegion(target);
      if (mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion(target, 450);
      }
      fetchAddressForCoords(coords.lat, coords.lon);
    } catch {
    } finally {
      setLocatingUser(false);
    }
  };

  const fetchAddressForCoords = (lat: number, lon: number) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setLoadingAddress(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const addr = await Promise.race([
          reverseGeocode(lat, lon),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 3000)
          ),
        ]);
        if (addr) {
          setSelectedAddress(addr);
        }
      } catch {
        setSelectedAddress(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      } finally {
        setLoadingAddress(false);
      }
    }, 350);
  };

  const handleRegionChangeComplete = useCallback((newRegion: any) => {
    if (!newRegion) return;
    const prev = coordsRef.current;
    const dLat = Math.abs(newRegion.latitude - prev.lat);
    const dLon = Math.abs(newRegion.longitude - prev.lon);

    if (dLat > 0.00015 || dLon > 0.00015) {
      coordsRef.current = { lat: newRegion.latitude, lon: newRegion.longitude };
      fetchAddressForCoords(newRegion.latitude, newRegion.longitude);
    }
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    if (text.trim().length < 2) {
      setSearchSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const results = await searchAddressSuggestions(text, 4);
        setSearchSuggestions(results);
      } catch {
        setSearchSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectSearchSuggestion = async (item: AddressSuggestion) => {
    haptic();
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchSuggestions([]);
    setSelectedAddress(item.displayName);

    let lat = item.lat;
    let lon = item.lon;

    if (!lat || !lon) {
      const coords = await geocode(item.displayName);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
      }
    }

    if (lat && lon) {
      coordsRef.current = { lat, lon };
      const target = {
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      };
      if (mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion(target, 450);
      }
    }
  };

  const zoomDeltaRef = useRef(0.015);

  const zoomIn = () => {
    haptic();
    const current = coordsRef.current;
    zoomDeltaRef.current = Math.max(0.001, zoomDeltaRef.current / 2);
    const newReg = {
      latitude: current.lat,
      longitude: current.lon,
      latitudeDelta: zoomDeltaRef.current,
      longitudeDelta: zoomDeltaRef.current,
    };
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(newReg, 280);
    }
  };

  const zoomOut = () => {
    haptic();
    const current = coordsRef.current;
    zoomDeltaRef.current = Math.min(2.5, zoomDeltaRef.current * 2);
    const newReg = {
      latitude: current.lat,
      longitude: current.lon,
      latitudeDelta: zoomDeltaRef.current,
      longitudeDelta: zoomDeltaRef.current,
    };
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(newReg, 280);
    }
  };

  const handleConfirm = () => {
    if (selectedAddress.trim()) {
      haptic();
      onSelectAddress(selectedAddress.trim());
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <View style={styles.notch} />
            <View style={styles.headerRow}>
              <View style={styles.headerTitleRow}>
                <MaterialIcons name="pin-drop" size={20} color={GOLD} />
                <Text style={styles.headerTitle}>{title}</Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialIcons name="close" size={20} color="#C2C6D8" />
              </Pressable>
            </View>

            <View style={styles.searchBarWrapper}>
              <MaterialIcons name="search" size={18} color="#8C90A1" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search area, landmark or street..."
                placeholderTextColor="#6B7280"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="words"
                returnKeyType="search"
              />
              {isSearching ? (
                <ActivityIndicator size="small" color={GOLD} />
              ) : searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    setSearchSuggestions([]);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons name="cancel" size={16} color="#8C90A1" />
                </Pressable>
              ) : null}
            </View>

            {searchSuggestions.length > 0 && (
              <View style={styles.searchSuggestionsDropdown}>
                {searchSuggestions.map((item, idx) => (
                  <Pressable
                    key={`${item.displayName}-${idx}`}
                    onPress={() => handleSelectSearchSuggestion(item)}
                    style={({ pressed }) => [
                      styles.searchSuggestionItem,
                      idx < searchSuggestions.length - 1 && styles.suggestionBorder,
                      pressed && styles.suggestionPressed,
                    ]}
                  >
                    <MaterialIcons name="place" size={16} color={GOLD} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionPrimary} numberOfLines={1}>
                        {item.primaryText}
                      </Text>
                      {item.secondaryText ? (
                        <Text style={styles.suggestionSecondary} numberOfLines={1}>
                          {item.secondaryText}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.mapWrapper}>
            {MapView && Platform.OS !== 'web' ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={initialRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
                showsUserLocation
                showsMyLocationButton={false}
              />
            ) : (
              <View style={styles.webFallbackContainer}>
                <MaterialIcons name="place" size={36} color={GOLD} />
                <Text style={styles.webFallbackTitle}>Interactive Map</Text>
                <Text style={styles.webFallbackSubtitle}>
                  Coordinates: {coordsRef.current.lat.toFixed(4)}, {coordsRef.current.lon.toFixed(4)}
                </Text>
              </View>
            )}

            <View pointerEvents="none" style={styles.centerPinContainer}>
              <MaterialIcons name="location-on" size={42} color="#FF3B30" />
              <View style={styles.pinShadow} />
            </View>

            <View style={styles.floatingControls}>
              <Pressable
                onPress={zoomIn}
                style={({ pressed }) => [
                  styles.fabBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
                ]}
                accessibilityLabel="Zoom In"
              >
                <MaterialIcons name="add" size={22} color="#FFFFFF" />
              </Pressable>

              <Pressable
                onPress={zoomOut}
                style={({ pressed }) => [
                  styles.fabBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
                ]}
                accessibilityLabel="Zoom Out"
              >
                <MaterialIcons name="remove" size={22} color="#FFFFFF" />
              </Pressable>

              <Pressable
                onPress={() => {
                  haptic();
                  locateUser();
                }}
                style={({ pressed }) => [
                  styles.fabBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
                ]}
                accessibilityLabel="Locate Me"
              >
                {locatingUser ? (
                  <ActivityIndicator size="small" color={PRIMARY_BLUE} />
                ) : (
                  <MaterialIcons name="my-location" size={22} color={PRIMARY_BLUE} />
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.bottomCard}>
            <View style={styles.addressBox}>
              <MaterialIcons name="place" size={20} color={GREEN} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>PINPOINTED LOCATION</Text>
                {loadingAddress ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={GOLD} />
                    <Text style={styles.loadingText}>Resolving address…</Text>
                  </View>
                ) : (
                  <Text style={styles.addressText} numberOfLines={2}>
                    {selectedAddress || 'Move pin to choose address'}
                  </Text>
                )}
              </View>
            </View>

            <Pressable
              onPress={handleConfirm}
              disabled={loadingAddress || !selectedAddress.trim()}
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                (!selectedAddress.trim() || loadingAddress) && { opacity: 0.5 },
              ]}
            >
              <LinearGradient
                colors={['#1E75FF', colors.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmGradient}
              >
                <MaterialIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Confirm Pinpoint Address</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '84%',
    backgroundColor: '#0F131C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    display: 'flex',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#121622',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    zIndex: 20,
  },
  notch: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#FFFFFF',
    padding: 0,
  },
  searchSuggestionsDropdown: {
    marginTop: 6,
    backgroundColor: '#181D2C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  searchSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  suggestionPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  suggestionPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  suggestionSecondary: {
    fontSize: 11,
    color: '#8C90A1',
    marginTop: 1,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#141824',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  webFallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  webFallbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  webFallbackSubtitle: {
    fontSize: 12,
    color: '#8C90A1',
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -21,
    marginTop: -42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinShadow: {
    width: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    marginTop: -2,
  },
  floatingControls: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 10,
    alignItems: 'center',
  },
  fabBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2433',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bottomCard: {
    backgroundColor: '#121622',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  addressText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  loadingText: {
    fontSize: 12,
    color: GOLD,
  },
  confirmBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
