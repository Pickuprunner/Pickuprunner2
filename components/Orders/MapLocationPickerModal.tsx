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
import { reverseGeocode, geocode, searchAddressSuggestions, getPlaceCoordinates, getRegionFromBbox, AddressSuggestion } from '@/lib/distance';
import { useLocationStore } from '@/store/useLocationStore';

const DEFAULT_MAP_COORDS = { lat: 31.9576, lon: -110.9709 }; // Sahuarita, Arizona

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
  onSelectAddress: (address: string, coords?: { lat: number; lon: number }) => void;
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
  const initialCoords = useLocationStore.getState().currentLocation || DEFAULT_MAP_COORDS;
  const coordsRef = useRef<{ lat: number; lon: number }>(initialCoords);
  const [initialRegion, setInitialRegion] = useState({
    latitude: initialCoords.lat,
    longitude: initialCoords.lon,
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
  });

  const [selectedAddress, setSelectedAddress] = useState(initialAddress);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipReverseGeocodeRef = useRef(false);

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
          const target = getRegionFromBbox(coords.bbox, coords);
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
        accuracy: Location.Accuracy.Highest,
      });
      const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      coordsRef.current = coords;

      const target = {
        latitude: coords.lat,
        longitude: coords.lon,
        latitudeDelta: 0.0025,
        longitudeDelta: 0.0025,
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
        setSelectedAddress(`${lat}, ${lon}`);
      } finally {
        setLoadingAddress(false);
      }
    }, 350);
  };

  const handleRegionChangeComplete = useCallback((newRegion: any) => {
    if (!newRegion) return;
    if (skipReverseGeocodeRef.current) {
      skipReverseGeocodeRef.current = false;
      return;
    }
    const prev = coordsRef.current;
    const dLat = Math.abs(newRegion.latitude - prev.lat);
    const dLon = Math.abs(newRegion.longitude - prev.lon);

    if (dLat > 0.00001 || dLon > 0.00001) {
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
        const results = await searchAddressSuggestions(text, 5, coordsRef.current);
        setSearchSuggestions(results);
      } catch {
        setSearchSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  const handleSelectSearchSuggestion = async (item: AddressSuggestion) => {
    haptic();
    Keyboard.dismiss();
    setSearchQuery(item.primaryText || item.displayName);
    setSearchSuggestions([]);
    setSelectedAddress(item.displayName);

    let lat = item.lat;
    let lon = item.lon;

    if (item.placeId) {
      const pCoords = await getPlaceCoordinates(item.placeId, item.displayName);
      if (pCoords) {
        lat = pCoords.lat;
        lon = pCoords.lon;
      }
    }

    let bbox = item.bbox;

    if (!lat || !lon) {
      const coords = await geocode(item.displayName);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
        if (!bbox) bbox = coords.bbox;
      }
    }

    if (lat && lon) {
      coordsRef.current = { lat, lon };
      skipReverseGeocodeRef.current = true;
      const target = getRegionFromBbox(bbox, { lat, lon });
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
      useLocationStore.getState().setCachedCoords(selectedAddress.trim(), coordsRef.current);
      onSelectAddress(selectedAddress.trim(), coordsRef.current);
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
                onSubmitEditing={async () => {
                  if (!searchQuery.trim()) return;
                  Keyboard.dismiss();
                  if (searchSuggestions.length > 0) {
                    handleSelectSearchSuggestion(searchSuggestions[0]);
                    return;
                  }
                  setIsSearching(true);
                  const coords = await geocode(searchQuery);
                  setIsSearching(false);
                  if (coords) {
                    setSelectedAddress(searchQuery.trim());
                    coordsRef.current = coords;
                    skipReverseGeocodeRef.current = true;
                    const target = getRegionFromBbox(coords.bbox, coords);
                    if (mapRef.current?.animateToRegion) {
                      mapRef.current.animateToRegion(target, 450);
                    }
                  }
                }}
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
              <View style={styles.floatingDropdown}>
                {searchSuggestions.map((item, idx) => (
                  <Pressable
                    key={`${item.displayName}-${idx}`}
                    onPress={() => handleSelectSearchSuggestion(item)}
                    style={({ pressed }) => [
                      styles.suggestionItem,
                      idx < searchSuggestions.length - 1 && styles.suggestionBorder,
                      pressed && styles.suggestionPressed,
                    ]}
                  >
                    <View style={styles.suggestionIconCircle}>
                      <MaterialIcons name="place" size={16} color={GOLD} />
                    </View>
                    <View style={styles.suggestionTextCol}>
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
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
                showsBuildings={true}
                showsIndoors={true}
                showsPointsOfInterest={true}
              />
            ) : (
              <View style={styles.webFallbackContainer}>
                <MaterialIcons name="place" size={36} color={GOLD} />
                <Text style={styles.webFallbackTitle}>Interactive Map</Text>
                <Text style={styles.webFallbackSubtitle}>
                  Coordinates: {coordsRef.current.lat}, {coordsRef.current.lon}
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
  floatingDropdown: {
    position: 'absolute',
    top: 92,
    left: 16,
    right: 16,
    backgroundColor: '#181D2C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 99999,
    elevation: 50,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
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
    width: 42,
    height: 42,
    marginLeft: -21,
    marginTop: -42,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pinShadow: {
    position: 'absolute',
    bottom: -1,
    width: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
