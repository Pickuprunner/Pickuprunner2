/**
 * Selected order store — survives web page navigations via sessionStorage.
 */
import type { Order } from './orders';
import { Platform } from 'react-native';

const KEY = 'selected_order';

export function setSelectedOrder(order: Order) {
  try {
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(KEY, JSON.stringify(order));
    }
  } catch {}
  // Also keep in memory for native
  _order = order;
}

export function getSelectedOrder(): Order | null {
  if (_order) return _order;
  try {
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as Order;
    }
  } catch {}
  return null;
}

let _order: Order | null = null;
