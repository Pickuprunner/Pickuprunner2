import { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Subscribes to Blink auth state changes.
 * Returns current user, loading state, and authenticated flag.
 * Safe to call from multiple components — each gets its own subscription.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Safety net: never stay in loading state longer than 3s
    const timeout = setTimeout(() => {
      setState((prev) => prev.isLoading ? { ...prev, isLoading: false } : prev);
    }, 3000);

    const unsubscribe = blink.auth.onAuthStateChanged((authState) => {
      if (!authState.isLoading) {
        clearTimeout(timeout);
        setState({
          user: authState.user
            ? {
                id: authState.user.id,
                email: authState.user.email ?? '',
                displayName: authState.user.displayName ?? null,
              }
            : null,
          isLoading: false,
          isAuthenticated: authState.isAuthenticated,
        });
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  return state;
}
