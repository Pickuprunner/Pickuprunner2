import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocationCoords {
  lat: number;
  lon: number;
  bbox?: [number, number, number, number]; 
}

export interface AddressSuggestion {
  displayName: string;
  lat: number;
  lon: number;
  primaryText: string;
  secondaryText: string;
  placeId?: string;
  bbox?: [number, number, number, number]; 
}

interface LocationStoreState {
  geocodeCache: Record<string, LocationCoords>;
  reverseGeocodeCache: Record<string, string>;
  searchCache: Record<string, AddressSuggestion[]>;
  distanceCache: Record<string, number>;
  currentLocation: { lat: number; lon: number; address?: string } | null;

  setCachedCoords: (address: string, coords: LocationCoords) => void;
  getCachedCoords: (address: string) => LocationCoords | null;

  setCachedReverseGeocode: (lat: number, lon: number, address: string) => void;
  getCachedReverseGeocode: (lat: number, lon: number) => string | null;

  setCachedSearch: (key: string, results: AddressSuggestion[]) => void;
  getCachedSearch: (key: string) => AddressSuggestion[] | null;

  setCachedDistance: (pickup: string, delivery: string, miles: number) => void;
  getCachedDistance: (pickup: string, delivery: string) => number | null;

  setCurrentLocation: (location: { lat: number; lon: number; address?: string } | null) => void;
  clearLocationCache: () => void;
}

export const useLocationStore = create<LocationStoreState>()(
  persist(
    (set, get) => ({
      geocodeCache: {},
      reverseGeocodeCache: {},
      searchCache: {},
      distanceCache: {},
      currentLocation: null,

      setCachedCoords: (address, coords) => {
        const key = address.trim().toLowerCase();
        if (!key) return;
        set((state) => ({
          geocodeCache: { ...state.geocodeCache, [key]: coords },
        }));
      },

      getCachedCoords: (address) => {
        const key = address.trim().toLowerCase();
        return get().geocodeCache[key] || null;
      },

      setCachedReverseGeocode: (lat, lon, address) => {
        const key = `${lat},${lon}`;
        set((state) => ({
          reverseGeocodeCache: { ...state.reverseGeocodeCache, [key]: address },
        }));
      },

      getCachedReverseGeocode: (lat, lon) => {
        const key = `${lat},${lon}`;
        return get().reverseGeocodeCache[key] || null;
      },

      setCachedSearch: (key, results) => {
        const k = key.trim().toLowerCase();
        set((state) => ({
          searchCache: { ...state.searchCache, [k]: results },
        }));
      },

      getCachedSearch: (key) => {
        const k = key.trim().toLowerCase();
        return get().searchCache[k] || null;
      },

      setCachedDistance: (pickup, delivery, miles) => {
        const key = `${pickup.trim().toLowerCase()}->${delivery.trim().toLowerCase()}`;
        set((state) => ({
          distanceCache: { ...state.distanceCache, [key]: miles },
        }));
      },

      getCachedDistance: (pickup, delivery) => {
        const key = `${pickup.trim().toLowerCase()}->${delivery.trim().toLowerCase()}`;
        const val = get().distanceCache[key];
        return typeof val === 'number' ? val : null;
      },

      setCurrentLocation: (currentLocation) => set({ currentLocation }),

      clearLocationCache: () =>
        set({
          geocodeCache: {},
          reverseGeocodeCache: {},
          searchCache: {},
          distanceCache: {},
        }),
    }),
    {
      name: 'pickuprunner-location-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        geocodeCache: state.geocodeCache,
        reverseGeocodeCache: state.reverseGeocodeCache,
        searchCache: state.searchCache,
        distanceCache: state.distanceCache,
      }),
    }
  )
);
