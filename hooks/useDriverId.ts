/**
 * Returns a stable driver identifier that persists across app restarts.
 * - Signed-in: uses the auth user's ID.
 * - Guest: generates a UUID on first run and stores it in AsyncStorage.
 *
 * This ensures the queue cap (3 orders) works even without authentication.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'pickup_runner_device_driver_id';

function generateId(): string {
  // Simple UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useDriverId(): string | undefined {
  const { user, isLoading } = useAuth();
  // Start with a stable in-memory ID so guest/test mode can accept an order
  // immediately; the effect below replaces it with the persisted device ID.
  const [deviceId, setDeviceId] = useState<string>(() => generateId());

  useEffect(() => {
    // If auth user is present, no need for device ID
    if (user?.id) return;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setDeviceId(stored);
          return;
        }
        await AsyncStorage.setItem(STORAGE_KEY, deviceId);
      } catch {
        // Keep the already-created in-memory ID if storage is unavailable.
      }
    })();
  }, [user?.id, deviceId]);

  if (isLoading) return undefined;
  return user?.id ?? deviceId;
}
