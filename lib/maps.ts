import { Linking, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocationStore } from '@/store/useLocationStore';
import { geocode } from '@/lib/distance';

export interface MapNavigationTarget {
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
}
export async function openMapsNavigation(
  targetOrAddress?: string | MapNavigationTarget | null,
  lat?: number | string | null,
  lng?: number | string | null
) {
  let address = '';
  let finalLat = lat;
  let finalLng = lng;

  if (targetOrAddress && typeof targetOrAddress === 'object') {
    address = targetOrAddress.address || '';
    if (finalLat == null) finalLat = targetOrAddress.lat;
    if (finalLng == null) finalLng = targetOrAddress.lng;
  } else if (typeof targetOrAddress === 'string') {
    address = targetOrAddress;
  }

  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
  }

  let numLat = typeof finalLat === 'number' ? finalLat : finalLat ? parseFloat(String(finalLat)) : NaN;
  let numLng = typeof finalLng === 'number' ? finalLng : finalLng ? parseFloat(String(finalLng)) : NaN;
  let hasCoords = Number.isFinite(numLat) && Number.isFinite(numLng) && numLat !== 0 && numLng !== 0;

  const cleanAddress = address ? address.trim() : '';

  if (!hasCoords && cleanAddress) {
    const cached = useLocationStore.getState().getCachedCoords(cleanAddress);
    if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lon)) {
      numLat = cached.lat;
      numLng = cached.lon;
      hasCoords = true;
    } else {
      try {
        const fetched = await geocode(cleanAddress);
        if (fetched && Number.isFinite(fetched.lat) && Number.isFinite(fetched.lon)) {
          numLat = fetched.lat;
          numLng = fetched.lon;
          hasCoords = true;
        }
      } catch (err) {
        console.warn('[openMapsNavigation] Geocoding lookup error:', err);
      }
    }
  }

  if (!hasCoords && !cleanAddress) {
    console.warn('[openMapsNavigation] No valid address or coordinates provided');
    return;
  }

  const destinationParam = hasCoords ? `${numLat},${numLng}` : encodeURIComponent(cleanAddress);

  const googleDrivingUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}&travelmode=driving&dir_action=navigate`;

  if (Platform.OS === 'android') {
    const googleNavIntent = `google.navigation:q=${destinationParam}&mode=d`;
    try {
      await Linking.openURL(googleNavIntent);
    } catch (err) {
      await Linking.openURL(googleDrivingUrl).catch(() => { });
    }
  } else if (Platform.OS === 'ios') {
    const appleUrl = `maps://maps.apple.com/?daddr=${destinationParam}&dirflg=d`;
    try {
      const canOpen = await Linking.canOpenURL(appleUrl);
      if (canOpen) {
        await Linking.openURL(appleUrl);
      } else {
        await Linking.openURL(googleDrivingUrl);
      }
    } catch {
      await Linking.openURL(googleDrivingUrl).catch(() => { });
    }
  } else {
    await Linking.openURL(googleDrivingUrl).catch(() => { });
  }
}
