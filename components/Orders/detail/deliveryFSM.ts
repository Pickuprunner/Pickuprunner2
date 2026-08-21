import type { Order } from '@/lib/orders';

export type DeliveryState = 'pending' | 'accepted' | 'picked_up' | 'delivered';

export type DeliveryAction =
  | { type: 'HYDRATE'; status: DeliveryState; photoUrl?: string | null }
  | { type: 'ACCEPT_ORDER' }
  | { type: 'CONFIRM_PICKUP' }
  | { type: 'SET_PHOTO'; uri: string }
  | { type: 'COMPLETE_DELIVERY' }
  | { type: 'SET_UPLOADING'; uploading: boolean };

export interface DeliveryFSMState {
  status: DeliveryState;
  photoUri: string | null;
  photoUrl: string | null;
  uploadingPhoto: boolean;
  userDriven: boolean;
}

export function deliveryFSM(state: DeliveryFSMState, action: DeliveryAction): DeliveryFSMState {
  switch (action.type) {
    case 'HYDRATE':
      if (state.userDriven) return state; // Guard user progress from remote refetch
      return {
        ...state,
        status: action.status,
        photoUrl: action.photoUrl ?? state.photoUrl,
        photoUri: action.photoUrl ?? state.photoUri,
      };

    case 'ACCEPT_ORDER':
      return {
        ...state,
        status: 'accepted',
        userDriven: true,
      };

    case 'CONFIRM_PICKUP':
      return {
        ...state,
        status: 'picked_up',
        userDriven: true,
      };

    case 'SET_PHOTO':
      return {
        ...state,
        photoUri: action.uri,
        photoUrl: action.uri,
      };

    case 'SET_UPLOADING':
      return {
        ...state,
        uploadingPhoto: action.uploading,
      };

    case 'COMPLETE_DELIVERY':
      return {
        ...state,
        status: 'delivered',
        userDriven: true,
      };

    default:
      return state;
  }
}
