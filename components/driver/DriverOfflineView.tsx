import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows } from '@/constants/design';
import { reverseGeocode } from '@/lib/distance';
import { Order } from '@/lib/orders';

interface DriverOfflineViewProps {
  onGoOnline: () => void;
  isLoading?: boolean;
  onOpenPreferences?: () => void;
  onOpenOpportunities?: () => void;
  onOpenMapFullscreen?: () => void;
  driverLocation?: { lat?: number; lng?: number };
  driverCity?: string;
  availableCount?: number;
  orders?: Order[];
}

export function DriverOfflineView({
  onGoOnline,
  isLoading = false,
  onOpenPreferences,
  onOpenOpportunities,
  driverLocation,
  driverCity: initialCity,
  availableCount = 0,
  orders = [],
}: DriverOfflineViewProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const hasAnimatedToUser = useRef(false);

  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }>({
    latitude: driverLocation?.lat || 37.422,
    longitude: driverLocation?.lng || -122.084,
    latitudeDelta: 0.035,
    longitudeDelta: 0.035,
  });

  const [city, setCity] = useState(initialCity || 'Your City');
  const totalOrdersCount = orders.length > 0 ? orders.length : availableCount;

  // Real-time GPS Tracking with live updates
  useEffect(() => {
    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    async function startLiveLocation() {
      try {
        // If parent passed valid GPS coords, use them first
        if (driverLocation?.lat && driverLocation?.lng) {
          const coords = {
            latitude: driverLocation.lat,
            longitude: driverLocation.lng,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          };
          if (isMounted) {
            setCurrentCoords(coords);
            if (!hasAnimatedToUser.current && mapRef.current?.animateToRegion) {
              mapRef.current.animateToRegion(coords, 600);
              hasAnimatedToUser.current = true;
            }
          }
          resolveCity(driverLocation.lat, driverLocation.lng);
        }

        if (Platform.OS === 'web') {
          if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (!isMounted || !pos?.coords) return;
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const coords = {
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.035,
                  longitudeDelta: 0.035,
                };
                setCurrentCoords(coords);
                if (!hasAnimatedToUser.current && mapRef.current?.animateToRegion) {
                  mapRef.current.animateToRegion(coords, 600);
                  hasAnimatedToUser.current = true;
                }
                resolveCity(lat, lng);
              },
              (err) => console.log('[DriverOfflineView] Web GPS:', err),
              { timeout: 8000, enableHighAccuracy: true }
            );
          }
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Instant current position
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          if (isMounted && loc?.coords) {
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            const coords = {
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.035,
              longitudeDelta: 0.035,
            };
            setCurrentCoords(coords);

            if (!hasAnimatedToUser.current && mapRef.current?.animateToRegion) {
              mapRef.current.animateToRegion(coords, 600);
              hasAnimatedToUser.current = true;
            }

            resolveCity(lat, lng);
          }

          // Real-time location watch listener
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 5000,
              distanceInterval: 10,
            },
            (newLoc) => {
              if (isMounted && newLoc?.coords) {
                const lat = newLoc.coords.latitude;
                const lng = newLoc.coords.longitude;
                setCurrentCoords((prev) => ({
                  ...prev,
                  latitude: lat,
                  longitude: lng,
                }));
              }
            }
          );
        }
      } catch (err) {
        console.log('[DriverOfflineView] Location resolve:', err);
      }
    }

    async function resolveCity(lat: number, lng: number) {
      try {
        if (Platform.OS !== 'web') {
          const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (rev && rev[0] && isMounted) {
            const detectedCity = rev[0].city || rev[0].district || rev[0].subregion || rev[0].region;
            if (detectedCity) setCity(detectedCity);
            return;
          }
        }

        const fullAddr = await reverseGeocode(lat, lng);
        if (fullAddr && isMounted) {
          const parts = fullAddr.split(',').map((p) => p.trim());
          if (parts.length >= 2) {
            setCity(parts[parts.length - 3] || parts[parts.length - 2] || parts[0]);
          }
        }
      } catch {}
    }

    startLiveLocation();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [driverLocation?.lat, driverLocation?.lng]);

  let MapView: any = null;
  let Marker: any = null;

  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
  } catch {
    MapView = null;
    Marker = null;
  }

  const haptic = (type: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(type).catch(() => {});
    }
  };

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Ambient Glow */}
      <LinearGradient
        colors={['rgba(0, 102, 255, 0.12)', 'rgba(15, 19, 28, 0)']}
        style={styles.ambientGlow}
        pointerEvents="none"
      />

      {/* Top Header Row */}
      <View style={styles.headerContainer}>
        <View style={styles.topRightIconsRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              haptic(Haptics.ImpactFeedbackStyle.Light);
              onOpenPreferences?.();
            }}
            style={styles.circleIconBtn}
          >
            <MaterialIcons name="tune" size={20} color="#DFE2EF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.mainTitle}>You're offline</Text>
        <Text style={styles.subTitle}>Ready to go?</Text>
      </View>

      {/* Map Card - Clean White / Standard Map Background & Perfect Circle Driver Puck */}
      <View style={styles.mapCard}>
        {MapView && Platform.OS !== 'web' ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={currentCoords}
            showsUserLocation
            showsCompass={false}
            showsMyLocationButton={false}
            toolbarEnabled={false}
          >
            {/* Real Driver GPS Location Puck (Perfect Full Circle) */}
            <Marker
              coordinate={{ latitude: currentCoords.latitude, longitude: currentCoords.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              title="Your Location"
              flat
            >
              <View style={styles.puckContainer}>
                <View style={styles.puckHalo} />
                <View style={styles.puckCore}>
                  <MaterialIcons name="navigation" size={13} color="#FFFFFF" />
                </View>
              </View>
            </Marker>
          </MapView>
        ) : (
          /* Clean Map Canvas Fallback (Web) */
          <View style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']}
              style={StyleSheet.absoluteFill}
            />

            {/* Simulated Clean Roads */}
            <View style={styles.roadNetwork}>
              <View style={[styles.roadLineLight, { top: 60, left: -20, width: 420, transform: [{ rotate: '12deg' }] }]} />
              <View style={[styles.roadLineLight, { top: 130, left: -30, width: 440, transform: [{ rotate: '-22deg' }] }]} />
              <View style={[styles.roadLineLight, { top: 220, left: 10, width: 400, transform: [{ rotate: '30deg' }] }]} />
              <View style={[styles.roadLineLight, { top: 100, left: 90, width: 280, transform: [{ rotate: '68deg' }] }]} />
              <View style={[styles.roadLineLightSecondary, { top: 40, left: 190, width: 220, transform: [{ rotate: '-40deg' }] }]} />
              <View style={[styles.roadLineLightSecondary, { top: 170, left: 70, width: 300, transform: [{ rotate: '8deg' }] }]} />
              <View style={styles.waterShapeLight} />
            </View>

            <Text style={styles.mapCityLabelLight}>{city}</Text>

            {/* Center Navigation Puck (Perfect Circle) */}
            <View style={styles.puckContainer}>
              <View style={styles.puckHalo} />
              <View style={styles.puckCore}>
                <MaterialIcons name="navigation" size={13} color="#FFFFFF" />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Opportunities Card Container */}
      <View style={styles.opportunitiesCardContainer}>
        <View style={styles.oppHeaderRow}>
          <View style={styles.oppTitleWrapper}>
            <Text style={styles.oppTitle}>Opportunities</Text>
            <View style={styles.oppBadge}>
              <Text style={styles.oppBadgeText}>
                {totalOrdersCount > 0 ? `${totalOrdersCount} New` : 'Live'}
              </Text>
            </View>
          </View>
          <View style={styles.oppArrowBtn}>
            <MaterialIcons name="arrow-forward" size={18} color="#DFE2EF" />
          </View>
        </View>

        <Text style={styles.oppSubtitle}>
          {totalOrdersCount > 0
            ? `${totalOrdersCount} active delivery requests near ${city}`
            : `Upcoming reservations and promotions for ${city}`}
        </Text>

        {/* Go Online Action Button - ONLY THIS BUTTON TRIGGERS GO ONLINE */}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isLoading}
          onPress={() => {
            haptic(Haptics.ImpactFeedbackStyle.Heavy);
            onGoOnline();
          }}
          style={styles.goOnlineBtn}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#0F131C" />
          ) : (
            <View style={styles.goOnlineContent}>
              <MaterialCommunityIcons
                name="steering"
                size={24}
                color="#0F131C"
                style={styles.steeringIcon}
              />
              <Text style={styles.goOnlineText}>Go online</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    paddingBottom: 20,
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  headerContainer: {
    marginBottom: 6,
    zIndex: 2,
  },
  topRightIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 8,
  },
  circleIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  subTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  mapCard: {
    flex: 1,
    minHeight: 280,
    maxHeight: 380,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    marginVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.glassLevel2Border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  puckContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puckHalo: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 102, 255, 0.22)',
    borderWidth: 2,
    borderColor: 'rgba(0, 102, 255, 0.45)',
  },
  puckCore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0066FF',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 5,
  },
  roadNetwork: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  roadLineLight: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#CBD5E1',
  },
  roadLineLightSecondary: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: '#E2E8F0',
  },
  waterShapeLight: {
    position: 'absolute',
    bottom: -30,
    left: -40,
    width: 240,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    transform: [{ rotate: '-25deg' }],
  },
  mapCityLabelLight: {
    position: 'absolute',
    top: 20,
    right: 20,
    color: '#3B82F6',
    fontSize: 20,
    fontWeight: '800',
    opacity: 0.85,
  },
  opportunitiesCardContainer: {
    backgroundColor: colors.glassLevel2Bg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    padding: 16,
    gap: 8,
    marginTop: 4,
  },
  oppHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  oppTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  oppTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  oppBadge: {
    backgroundColor: 'rgba(255, 227, 153, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  oppBadgeText: {
    color: '#FFE399',
    fontSize: 11,
    fontWeight: '700',
  },
  oppArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glassLevel3Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel3Border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oppSubtitle: {
    fontSize: 13.5,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  goOnlineBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  goOnlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  steeringIcon: {
    marginRight: 2,
  },
  goOnlineText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F131C',
    letterSpacing: 0.2,
  },
});
