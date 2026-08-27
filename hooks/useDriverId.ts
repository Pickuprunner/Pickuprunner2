import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'pickup_runner_device_driver_id';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useDriverId(): string | undefined {
  const { user, isLoading } = useAuth();
  const [deviceId, setDeviceId] = useState<string>(() => generateId());

  useEffect(() => {
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

      }
    })();
  }, [user?.id, deviceId]);

  if (isLoading) return undefined;
  return user?.id ?? deviceId;
}
