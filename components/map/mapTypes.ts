import { Platform, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Order } from '@/lib/orders';
import { colors } from '@/constants/design';

export const GOLD = colors.secondaryContainer; // #F4C300
export const GOLD_LIGHT = colors.secondary; // #FFE399
export const GREEN = colors.tertiary; // #00E297
export const CYAN = colors.primary; // #B3C5FF
export const COBALT = colors.primaryContainer; // #0066FF
export const BG = colors.background; // #0F131C
export const CARD_BG = colors.glassLevel2Bg; // rgba(255, 255, 255, 0.04)
export const CARD_BORDER = colors.glassLevel2Border; // rgba(255, 255, 255, 0.08)

export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0F131C' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F131C' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8C90A1' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#DFE2EF' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8C90A1' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#131A26' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1A202C' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#10141D' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A0AEC0' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#242D3D' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#171E2B' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#DFE2EF' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#161C27' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#080B12' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4A5568' }],
  },
];

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (Platform.OS !== 'web') {
    const feedback =
      style === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : style === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(feedback).catch(() => { });
  }
}

// Hardcoded center coordinates (used only as emergency fallback)
export const CENTER = { lat: 31.9572, lng: -110.9553 };

export function getCoords(order: Order): { lat: number; lng: number } {
  const rawLat = (order as any)?.pickupLat ?? (order as any)?.pickup_lat ?? (order as any)?.latitude ?? (order as any)?.lat;
  const rawLng = (order as any)?.pickupLng ?? (order as any)?.pickup_lng ?? (order as any)?.longitude ?? (order as any)?.lng;

  const latNum = typeof rawLat === 'number' ? rawLat : typeof rawLat === 'string' ? parseFloat(rawLat) : NaN;
  const lngNum = typeof rawLng === 'number' ? rawLng : typeof rawLng === 'string' ? parseFloat(rawLng) : NaN;

  const lat = Number.isFinite(latNum) ? latNum : CENTER.lat;
  const lng = Number.isFinite(lngNum) ? lngNum : CENTER.lng;

  return { lat, lng };
}

export function openMapsNavigation(address: string) {
  if (!address) return;
  haptic('medium');
  const encoded = encodeURIComponent(address);
  if (Platform.OS === 'ios') {
    Linking.openURL(`maps://maps.apple.com/?daddr=${encoded}`);
  } else if (Platform.OS === 'android') {
    Linking.openURL(`google.navigation:q=${encoded}`);
  } else {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`);
  }
}

export function makePhoneCall(phone?: string) {
  if (!phone) return;
  haptic('light');
  Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`);
}

export function openSmsMessage(phone?: string) {
  if (!phone) return;
  haptic('light');
  Linking.openURL(`sms:${phone.replace(/[^0-9+]/g, '')}`);
}
