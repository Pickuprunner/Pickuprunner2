import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppRole = 'customer' | 'driver';

const ROLE_KEY = 'app_role';

/**
 * Persists and returns the user's chosen role (customer | driver).
 * Returns null while loading (role not yet read from storage).
 */
export function useRole() {
  const [role, setRoleState] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ROLE_KEY)
      .then((stored) => {
        setRoleState((stored as AppRole) || null);
      })
      .catch(() => setRoleState(null))
      .finally(() => setIsLoading(false));
  }, []);

  const setRole = useCallback(async (newRole: AppRole) => {
    await AsyncStorage.setItem(ROLE_KEY, newRole);
    setRoleState(newRole);
  }, []);

  const clearRole = useCallback(async () => {
    await AsyncStorage.removeItem(ROLE_KEY);
    setRoleState(null);
  }, []);

  return { role, isLoading, setRole, clearRole };
}

/** Standalone helpers for use outside React (e.g. in lib files) */
export async function getSavedRole(): Promise<AppRole | null> {
  try {
    const val = await AsyncStorage.getItem(ROLE_KEY);
    return (val as AppRole) || null;
  } catch {
    return null;
  }
}

export async function saveRole(role: AppRole): Promise<void> {
  await AsyncStorage.setItem(ROLE_KEY, role);
}
