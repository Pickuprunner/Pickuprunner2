import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

function resolveApiUrl(url: string = rawApiUrl): string {
  if (!url) return 'http://localhost:8080';
  if (Platform.OS === 'android') {
    return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  if (Platform.OS === 'ios' || Platform.OS === 'web') {
    return url.replace('10.0.2.2', 'localhost');
  }
  return url;
}

type NetworkListener = (isConnected: boolean) => void;

class NetworkManager {
  private static instance: NetworkManager;
  private isConnected: boolean = true;
  private consecutiveFailures: number = 0;
  private listeners: Set<NetworkListener> = new Set();
  private heartbeatInterval: any = null;
  private isPinging: boolean = false;

  private constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.isConnected = typeof navigator !== 'undefined' ? navigator.onLine : true;
      window.addEventListener('online', () => {
        this.consecutiveFailures = 0;
        this.setConnected(true);
      });
      window.addEventListener('offline', () => {
        this.consecutiveFailures = 3;
        this.setConnected(false);
      });
    }

    // React Native AppState listener — ping when app comes to foreground
    AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        this.ping(true);
      }
    });

    // Start background heartbeat
    this.startHeartbeat();
  }

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  public getStatus(): boolean {
    return this.isConnected;
  }

  public setConnected(status: boolean) {
    if (this.isConnected !== status) {
      this.isConnected = status;
      this.listeners.forEach((listener) => {
        try {
          listener(status);
        } catch {}
      });
    }
  }

  public startHeartbeat() {
    this.stopHeartbeat();
    // 8-second interval when connected, adjusted to 3.5s when offline
    const intervalMs = this.isConnected ? 8000 : 3500;
    this.heartbeatInterval = setInterval(() => {
      this.ping(false);
    }, intervalMs);
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Pings connectivity.
   * @param isManualCheck When true (e.g. user taps retry), sets status immediately without waiting for threshold.
   */
  public async ping(isManualCheck: boolean = false): Promise<boolean> {
    if (this.isPinging) return this.isConnected;
    this.isPinging = true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const baseUrl = resolveApiUrl(rawApiUrl);

      const checkEndpoint = async (targetUrl: string) => {
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
          signal: controller.signal,
        });
        return response.status >= 200 && response.status < 500;
      };

      let isSuccess = false;
      try {
        // Fast internet reachability check
        isSuccess = await checkEndpoint('https://connectivitycheck.gstatic.com/generate_204');
      } catch {
        try {
          // Secondary fallback to local backend or Cloudflare trace
          isSuccess = await checkEndpoint(`${baseUrl}/health`);
        } catch {
          try {
            isSuccess = await checkEndpoint('https://1.1.1.1/cdn-cgi/trace');
          } catch {
            isSuccess = false;
          }
        }
      }

      clearTimeout(timeoutId);

      if (isSuccess) {
        this.consecutiveFailures = 0;
        this.setConnected(true);
        this.startHeartbeat();
        return true;
      } else {
        this.consecutiveFailures++;
        // Debounce: Require at least 2 consecutive failed checks (or manual check) before declaring offline
        if (isManualCheck || this.consecutiveFailures >= 2) {
          this.setConnected(false);
          this.startHeartbeat();
        }
        return this.isConnected;
      }
    } catch {
      this.consecutiveFailures++;
      if (isManualCheck || this.consecutiveFailures >= 2) {
        this.setConnected(false);
        this.startHeartbeat();
      }
      return this.isConnected;
    } finally {
      this.isPinging = false;
    }
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    listener(this.isConnected);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const networkManager = NetworkManager.getInstance();

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(networkManager.getStatus());
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    const unsubscribe = networkManager.subscribe((connected) => {
      if (isMountedRef.current) {
        setIsConnected(connected);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!isMountedRef.current) return isConnected;
    setIsChecking(true);
    try {
      const result = await networkManager.ping(true);
      if (isMountedRef.current) {
        setIsConnected(result);
      }
      return result;
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [isConnected]);

  return {
    isConnected,
    isChecking,
    checkConnection,
  };
}
