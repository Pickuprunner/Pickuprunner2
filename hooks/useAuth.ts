import { useCallback } from 'react';
import { useAuthStore, User } from '@/store/useAuthStore';
import { apiClient } from '@/lib/apiClient';

export interface AuthUser extends User {}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: {
    email: string;
    password: string;
    role: 'customer' | 'driver' | 'admin';
    displayName?: string;
    phone?: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<AuthUser | null>;
}

export function useAuth(): AuthState {
  const {
    user,
    token,
    isAuthenticated,
    isHydrated,
    setSession,
    clearSession,
    updateUser,
  } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const res = await apiClient.post<any>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const session = res?.data || res;
      const authToken = session.token || session.accessToken || '';
      setSession(session.user, authToken, session.refreshToken);
      return session.user;
    },
    [setSession]
  );

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      role: 'customer' | 'driver' | 'admin';
      displayName?: string;
      phone?: string;
    }): Promise<AuthUser> => {
      const res = await apiClient.post<any>('/auth/register', {
        ...payload,
        email: payload.email.trim().toLowerCase(),
      });

      const session = res?.data || res;
      const authToken = session.token || session.accessToken || '';
      setSession(session.user, authToken, session.refreshToken);
      return session.user;
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const fetchProfile = useCallback(async (): Promise<AuthUser | null> => {
    if (!token) return null;
    try {
      const res = await apiClient.get<any>('/users/me');
      const profile = res?.data || res;
      updateUser(profile);
      return profile;
    } catch {
      return null;
    }
  }, [token, updateUser]);

  return {
    user,
    token,
    isLoading: !isHydrated,
    isAuthenticated,
    login,
    register,
    logout,
    fetchProfile,
  };
}
