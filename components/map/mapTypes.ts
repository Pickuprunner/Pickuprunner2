import { Platform, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Order } from '@/lib/orders';
import { colors } from '@/constants/design';
import { useLocationStore } from '@/store/useLocationStore';

export const GOLD = colors.secondaryContainer; // #F4C300
export const GOLD_LIGHT = colors.secondary; // #FFE399
export const GREEN = colors.tertiary; // #00E297
export const CYAN = colors.primary; // #B3C5FF
export const COBALT = colors.primaryContainer; // #0066FF
export const ROUTE_ACTIVE = colors.primaryContainer; // #0066FF (Electric Blue)
export const ROUTE_PENDING = '#D97706'; // Warm Amber

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

export const CENTER = { lat: 31.9572, lng: -110.9553 };

export function getPickupCoords(order?: Order | null): { lat: number; lng: number } | null {
  if (!order) return null;
  const rawLat = (order as any)?.pickupLat ?? (order as any)?.pickup_lat ?? (order as any)?.storeLat ?? (order as any)?.store_lat;
  const rawLng = (order as any)?.pickupLng ?? (order as any)?.pickup_lng ?? (order as any)?.storeLng ?? (order as any)?.store_lng;

  const latNum = typeof rawLat === 'number' ? rawLat : rawLat ? parseFloat(String(rawLat)) : NaN;
  const lngNum = typeof rawLng === 'number' ? rawLng : rawLng ? parseFloat(String(rawLng)) : NaN;

  if (Number.isFinite(latNum) && Number.isFinite(lngNum) && latNum !== 0 && lngNum !== 0) {
    return { lat: latNum, lng: lngNum };
  }

  if (order.pickupAddress) {
    const cached = useLocationStore.getState().getCachedCoords(order.pickupAddress);
    if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lon)) {
      return { lat: cached.lat, lng: cached.lon };
    }
  }

  return null;
}

export function getDeliveryCoords(order?: Order | null): { lat: number; lng: number } | null {
  if (!order) return null;
  const rawLat = (order as any)?.deliveryLat ?? (order as any)?.delivery_lat ?? (order as any)?.customerLat ?? (order as any)?.customer_lat;
  const rawLng = (order as any)?.deliveryLng ?? (order as any)?.delivery_lng ?? (order as any)?.customerLng ?? (order as any)?.customer_lng;

  const latNum = typeof rawLat === 'number' ? rawLat : rawLat ? parseFloat(String(rawLat)) : NaN;
  const lngNum = typeof rawLng === 'number' ? rawLng : rawLng ? parseFloat(String(rawLng)) : NaN;

  if (Number.isFinite(latNum) && Number.isFinite(lngNum) && latNum !== 0 && lngNum !== 0) {
    return { lat: latNum, lng: lngNum };
  }

  if (order.deliveryAddress) {
    const cached = useLocationStore.getState().getCachedCoords(order.deliveryAddress);
    if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lon)) {
      return { lat: cached.lat, lng: cached.lon };
    }
  }

  return null;
}

export function getCoords(order: Order): { lat: number; lng: number } {
  return getDeliveryCoords(order) || getPickupCoords(order) || CENTER;
}

export { openMapsNavigation, type MapNavigationTarget } from '@/lib/maps';


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
