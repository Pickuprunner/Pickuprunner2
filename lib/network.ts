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
  private listeners: Set<NetworkListener> = new Set();
  private heartbeatInterval: any = null;
  private isPinging: boolean = false;

  private constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.isConnected = typeof navigator !== 'undefined' ? navigator.onLine : true;
      window.addEventListener('online', () => this.setConnected(true));
      window.addEventListener('offline', () => this.setConnected(false));
    }

    // React Native AppState listener
    AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        this.ping();
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
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.ping();
    }, 2500);
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public async ping(): Promise<boolean> {
    if (this.isPinging) return this.isConnected;
    this.isPinging = true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      // Fast race check: test backend /health and internet generate_204 simultaneously
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
        isSuccess = await checkEndpoint(`${baseUrl}/health`);
      } catch {
        try {
          // Fallback global reachability ping
          isSuccess = await checkEndpoint('https://connectivitycheck.gstatic.com/generate_204');
        } catch {
          isSuccess = false;
        }
      }

      clearTimeout(timeoutId);
      this.setConnected(isSuccess);
      return isSuccess;
    } catch {
      this.setConnected(false);
      return false;
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

    // Immediate initial ping
    networkManager.ping();

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!isMountedRef.current) return isConnected;
    setIsChecking(true);
    try {
      const result = await networkManager.ping();
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
