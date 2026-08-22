/**
 * Selected order store — integrates with useOrderStore and survives web page navigations via sessionStorage.
 */
import { useOrderStore, Order } from '@/store/useOrderStore';
import { Platform } from 'react-native';

const KEY = 'selected_order';

export function setSelectedOrder(order: Order) {
  try {
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(KEY, JSON.stringify(order));
    }
  } catch {}
  useOrderStore.getState().setSelectedOrder(order.id);
  _order = order;
}

export function getSelectedOrder(): Order | null {
  const selectedId = useOrderStore.getState().selectedOrderId;
  if (selectedId) {
    const found = useOrderStore.getState().orders.find((o) => o.id === selectedId);
    if (found) return found;
  }

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
