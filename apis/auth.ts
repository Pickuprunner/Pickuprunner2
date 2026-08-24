import { apiClient } from '@/lib/apiClient';
import { User } from '@/store/useAuthStore';

export interface RegisterPayload {
  email: string;
  password: string;
  role: 'customer' | 'driver' | 'admin';
  displayName?: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthResponse {
  success?: boolean;
  message?: string;
  data: AuthSession;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', payload),

  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', payload),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>('/auth/refresh', { refreshToken }, { skipAuth: true }),

  forgotPassword: (email: string) =>
    apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', { email }, { skipAuth: true }),

  resetPassword: (userId: string, token: string, password: string) =>
    apiClient.post<{ success: boolean; message: string }>(
      `/auth/reset-password/${userId}/${token}`,
      { password },
      { skipAuth: true }
    ),

  logout: (refreshToken?: string) =>
    apiClient.post<{ success: boolean; message: string }>('/auth/logout', { refreshToken }),
};
