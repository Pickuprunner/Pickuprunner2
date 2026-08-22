import { useAuthStore, User } from '../store/useAuthStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

export class ApiError extends Error {
  public isNetworkError: boolean;

  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.isNetworkError = status === 0;
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  _retry?: boolean;
}

let refreshTokenPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const store = useAuthStore.getState();
  const refreshToken = store.refreshToken;

  if (!refreshToken) {
    store.clearSession();
    throw new ApiError(401, 'No refresh token available');
  }

  if (!refreshTokenPromise) {
    refreshTokenPromise = (async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        const raw = await response.json().catch(() => null);

        if (!response.ok) {
          const status = response.status;
          if (status === 401 || status === 403) {
            useAuthStore.getState().clearSession();
          }
          throw new ApiError(
            status,
            raw?.error || raw?.message || 'Token refresh failed',
            raw
          );
        }

        const session = raw?.data || raw;
        const newAccessToken = session.accessToken || session.token;
        const newRefreshToken = session.refreshToken || refreshToken;
        const user = session.user || store.user;

        if (newAccessToken && user) {
          useAuthStore.getState().setSession(user, newAccessToken, newRefreshToken);
        }

        return newAccessToken;
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 403) {
          useAuthStore.getState().clearSession();
        }
        throw err;
      } finally {
        refreshTokenPromise = null;
      }
    })();
  }

  return refreshTokenPromise;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, _retry, ...fetchOptions } = options;
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (networkError: any) {
    throw new ApiError(0, networkError?.message || 'Network request failed');
  }

  const isAuthEndpoint = /\/auth\/(login|register|refresh|forgot-password|reset-password)$/.test(
    endpoint
  );

  // Auto-refresh token on 401 if refreshToken is present and request is not an auth endpoint
  if (response.status === 401 && !skipAuth && !_retry && !isAuthEndpoint) {
    const store = useAuthStore.getState();
    if (store.refreshToken) {
      try {
        const newAccessToken = await refreshAccessToken();
        return request<T>(endpoint, {
          ...options,
          _retry: true,
          headers: {
            ...headers,
            Authorization: `Bearer ${newAccessToken}`,
          },
        });
      } catch (refreshErr) {
        // Fall through to parse original 401 response or throw error
      }
    } else {
      store.clearSession();
    }
  }

  let data: any = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (typeof data === 'object' && data !== null
        ? data.error ||
          data.message ||
          (Array.isArray(data.errors) ? data.errors.join(', ') : null)
        : null) || `Request failed with status ${response.status}`;

    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  del: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
