import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  role: 'customer' | 'driver' | 'admin';
  displayName?: string | null;
  phone?: string | null;
  status?: string;
  isAvailable?: boolean;
  emailVerified?: boolean;
  stripeAccountId?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setSession: (user: User, token: string, refreshToken?: string | null) => void;
  updateUser: (partialUser: Partial<User>) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: false,
      setSession: (user, token, refreshToken = null) =>
        set({
          user,
          token,
          refreshToken: refreshToken ?? null,
          isAuthenticated: true,
        }),
      updateUser: (partialUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : null,
        })),
      clearSession: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
