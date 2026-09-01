import { useCallback, useEffect } from 'react';
import { useAuthStore, User } from '@/store/useAuthStore';
import { authApi, usersApi, UpdateProfilePayload } from '@/apis';
import { registerAndSyncDeviceToken } from '@/lib/notifications';

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
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
  forgotPassword: (
    email: string,
    role?: string
  ) => Promise<{ success: boolean; message: string; data?: { userId: string; token: string; resetLink: string } }>;
  resetPassword: (userId: string, token: string, password: string) => Promise<{ success: boolean; message: string }>;
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

  useEffect(() => {
    if (isHydrated && isAuthenticated && user?.id) {
      registerAndSyncDeviceToken(user.id);
    }
  }, [isHydrated, isAuthenticated, user?.id]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const res = await authApi.login({
        email: email.trim().toLowerCase(),
        password,
      });

      const session = res?.data || res;
      const authToken = (session as any).token || (session as any).accessToken || '';
      setSession(session.user, authToken, session.refreshToken);

      // Trigger permission check & device token backend sync
      registerAndSyncDeviceToken(session.user?.id);

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
      const res = await authApi.register({
        ...payload,
        email: payload.email.trim().toLowerCase(),
      });

      const session = res?.data || res;
      const authToken = (session as any).token || (session as any).accessToken || '';
      setSession(session.user, authToken, session.refreshToken);

      // Trigger permission check & device token backend sync
      registerAndSyncDeviceToken(session.user?.id);

      return session.user;
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        await authApi.logout(refreshToken).catch(() => {});
      }
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const fetchProfile = useCallback(async (): Promise<AuthUser | null> => {
    if (!token) return null;
    try {
      const profile = await usersApi.getMe();
      updateUser(profile);
      return profile;
    } catch {
      return null;
    }
  }, [token, updateUser]);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload): Promise<AuthUser> => {
      const updated = await usersApi.updateMe(payload);
      updateUser(updated);
      return updated;
    },
    [updateUser]
  );

  const forgotPassword = useCallback(async (email: string, role?: string) => {
    return authApi.forgotPassword(email.trim().toLowerCase(), role);
  }, []);

  const resetPassword = useCallback(async (userId: string, token: string, password: string) => {
    return authApi.resetPassword(userId, token, password);
  }, []);

  return {
    user,
    token,
    isLoading: !isHydrated,
    isAuthenticated,
    login,
    register,
    logout,
    fetchProfile,
    updateProfile,
    forgotPassword,
    resetPassword,
  };
}
