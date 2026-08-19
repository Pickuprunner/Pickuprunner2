import { Platform, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Order } from '@/lib/orders';

export const GOLD = '#E5A93C';
export const GOLD_LIGHT = '#F5C400';
export const GREEN = '#22C55E';
export const CYAN = '#00B2FF';
export const BG = '#0F131C';
export const CARD_BG = 'rgba(255, 255, 255, 0.04)';
export const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';

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

export function getCoords(order: Order) {
  let hash = 0;
  for (let i = 0; i < order.id.length; i++) hash = (hash * 31 + order.id.charCodeAt(i)) | 0;
  const lat = CENTER.lat + (((hash % 1000) - 500) / 10000) * 0.08;
  const lng = CENTER.lng + ((((hash >> 4) % 1000) - 500) / 10000) * 0.08;
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
