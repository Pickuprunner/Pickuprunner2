import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows } from '@/constants/design';
import { useAuthStore } from '@/store/useAuthStore';
import { DARK_MAP_STYLE } from '@/components/map/mapTypes';

interface CustomerOfflineViewProps {
  onRetry?: () => void;
  isLoading?: boolean;
  onOpenProfile?: () => void;
  customerLocation?: { lat?: number; lng?: number };
  customerCity?: string;
  cachedOrdersCount?: number;
  avatar?: string;
  avatarUrl?: string | null;
}

export function CustomerOfflineView({
  onRetry,
  isLoading = false,
  onOpenProfile,
  customerLocation,
  customerCity: initialCity,
  cachedOrdersCount = 0,
  avatar,
  avatarUrl,
}: CustomerOfflineViewProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const resolvedAvatar =
    avatar || (user?.displayName || user?.email || 'C').charAt(0).toUpperCase();
  const resolvedAvatarUrl = avatarUrl !== undefined ? avatarUrl : user?.photoUrl;
  const mapRef = useRef<any>(null);

  const currentCoords = {
    latitude: customerLocation?.lat || 37.422,
    longitude: customerLocation?.lng || -122.084,
    latitudeDelta: 0.035,
    longitudeDelta: 0.035,
  };

  const city = initialCity || 'Your Area';

  let MapView: any = null;
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
  } catch {
    MapView = null;
  }

  const haptic = (type: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(type).catch(() => {});
    }
  };

  const topPadding =
    insets.top > 0 ? insets.top : Platform.OS === 'android' ? 16 : 12;

  const handleAction = () => {
    haptic(Haptics.ImpactFeedbackStyle.Heavy);
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: topPadding,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      {/* Top Ambient Glow */}
      <LinearGradient
        colors={['rgba(255, 227, 153, 0.08)', 'rgba(15, 19, 28, 0)']}
        style={styles.ambientGlow}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.topRightIconsRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              haptic(Haptics.ImpactFeedbackStyle.Light);
              onOpenProfile?.();
            }}
            accessibilityLabel="Profile"
            style={styles.avatarBtn}
          >
            <View style={styles.avatarInner}>
              {resolvedAvatarUrl ? (
                <Image source={{ uri: resolvedAvatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{resolvedAvatar}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.mainTitle}>You're offline</Text>
        <Text style={styles.subTitle}>No internet connection</Text>
      </View>

      {/* Center Visual Map Card */}
      <View style={styles.mapCard} pointerEvents="none">
        {MapView && Platform.OS !== 'web' ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={currentCoords}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsUserLocation={false}
            showsCompass={false}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            customMapStyle={DARK_MAP_STYLE}
            userInterfaceStyle="dark"
          />
        ) : (
          <View style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={['#0F131C', '#141923', '#0F131C']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.roadNetwork}>
              <View
                style={[
                  styles.roadLineLight,
                  { top: 60, left: -20, width: 420, transform: [{ rotate: '12deg' }] },
                ]}
              />
              <View
                style={[
                  styles.roadLineLight,
                  { top: 130, left: -30, width: 440, transform: [{ rotate: '-22deg' }] },
                ]}
              />
              <View
                style={[
                  styles.roadLineLight,
                  { top: 220, left: 10, width: 400, transform: [{ rotate: '30deg' }] },
                ]}
              />
              <View
                style={[
                  styles.roadLineLight,
                  { top: 100, left: 90, width: 280, transform: [{ rotate: '68deg' }] },
                ]}
              />
              <View
                style={[
                  styles.roadLineLightSecondary,
                  { top: 40, left: 190, width: 220, transform: [{ rotate: '-40deg' }] },
                ]}
              />
              <View
                style={[
                  styles.roadLineLightSecondary,
                  { top: 170, left: 70, width: 300, transform: [{ rotate: '8deg' }] },
                ]}
              />
              <View style={styles.waterShapeLight} />
            </View>

            <Text style={styles.mapCityLabelLight}>{city}</Text>
          </View>
        )}

        {/* Center Radar / Location Pin */}
        <View style={styles.puckCenterOverlay} pointerEvents="none">
          <View style={styles.puckContainer}>
            <View style={styles.puckHalo} />
            <View style={styles.puckCore}>
              <MaterialIcons name="cloud-off" size={14} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Action / Status Card */}
      <View style={styles.actionCardContainer}>
        <View style={styles.actionHeaderRow}>
          <View style={styles.actionTitleWrapper}>
            <MaterialIcons
              name="signal-cellular-connected-no-internet-0-bar"
              size={22}
              color="#F87171"
            />
            <Text style={styles.actionTitle}>Connection Paused</Text>
          </View>
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        </View>

        <Text style={styles.actionSubtitle}>
          Please turn on mobile data or Wi-Fi to view and track your orders in real time.
        </Text>

        {cachedOrdersCount > 0 && (
          <View style={styles.cachedInfoRow}>
            <MaterialIcons name="save" size={14} color="#FFE399" />
            <Text style={styles.cachedInfoText}>
              {cachedOrdersCount} order{cachedOrdersCount > 1 ? 's' : ''} saved locally
            </Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isLoading}
          onPress={handleAction}
          style={styles.retryBtn}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#0F131C" />
          ) : (
            <View style={styles.retryBtnContent}>
              <MaterialCommunityIcons
                name="refresh"
                size={22}
                color="#0F131C"
                style={styles.retryIcon}
              />
              <Text style={styles.retryBtnText}>Retry Connection</Text>
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
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 227, 153, 0.15)',
    borderWidth: 1.5,
    borderColor: '#FFE399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F131C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    color: '#FFE399',
    fontSize: 15,
    fontWeight: '700',
  },
  mainTitle: {
    fontSize: Platform.OS === 'android' ? 34 : 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: Platform.OS === 'android' ? -0.2 : -0.8,
    lineHeight: Platform.OS === 'android' ? 42 : 38,
  },
  subTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 17,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    marginTop: 3,
    letterSpacing: Platform.OS === 'android' ? 0 : -0.2,
  },
  mapCard: {
    flex: 1,
    minHeight: 320,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0F131C',
    position: 'relative',
    marginVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.glassLevel2Border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  puckCenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  puckContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  puckHalo: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  puckCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.35,
          shadowRadius: 3,
        }
      : {}),
  },
  roadNetwork: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  roadLineLight: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#1A202C',
  },
  roadLineLightSecondary: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: '#242D3D',
  },
  waterShapeLight: {
    position: 'absolute',
    bottom: -30,
    left: -40,
    width: 240,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(8, 11, 18, 0.7)',
    transform: [{ rotate: '-25deg' }],
  },
  mapCityLabelLight: {
    position: 'absolute',
    top: 20,
    right: 20,
    color: '#FFE399',
    fontSize: 18,
    fontWeight: '800',
    opacity: 0.75,
  },
  actionCardContainer: {
    backgroundColor: colors.glassLevel2Bg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    padding: 16,
    gap: 8,
    marginTop: 4,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionTitle: {
    fontSize: Platform.OS === 'android' ? 22 : 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: Platform.OS === 'android' ? -0.2 : -0.4,
  },
  offlineBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  offlineBadgeText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '700',
  },
  actionSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  cachedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  cachedInfoText: {
    color: '#FFE399',
    fontSize: 12,
    fontWeight: '600',
  },
  retryBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFE399',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#FFE399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  retryBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryIcon: {
    marginRight: 2,
  },
  retryBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F131C',
    letterSpacing: 0.2,
  },
});
