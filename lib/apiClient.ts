import { Platform } from 'react-native';
import { useAuthStore, User } from '../store/useAuthStore';

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

export function resolveApiUrl(url: string = rawApiUrl): string {
  if (!url) return 'http://localhost:8080';
  if (Platform.OS === 'android') {
    return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  if (Platform.OS === 'ios' || Platform.OS === 'web') {
    return url.replace('10.0.2.2', 'localhost');
  }
  return url;
}

const BASE_URL = resolveApiUrl(rawApiUrl);

export const getApiBaseUrl = () => BASE_URL;

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

  const method = fetchOptions.method || 'GET';
  const tag = `[API ${method}] ${endpoint}`;

  if (fetchOptions.body) {
    try {
      const parsedBody = JSON.parse(fetchOptions.body as string);
      console.log(`\n📤 ${tag} Request:\n${JSON.stringify(parsedBody, null, 2)}`);
    } catch {
      console.log(`\n📤 ${tag} Request: ${fetchOptions.body}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (networkError: any) {
    console.warn(`\n❌ ${tag} -> NETWORK ERROR: ${networkError?.message || networkError}\n`);
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

    const formattedErr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(message);
    console.warn(`\n❌ ${tag} -> ${response.status} FAILED:\n${formattedErr}\n`);
    throw new ApiError(response.status, message, data);
  }

  const formattedData = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
  console.log(`\n✅ ${tag} -> ${response.status} OK:\n${formattedData}\n`);
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

  del: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'DELETE',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
};
