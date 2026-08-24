import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';

export default function Index() {
  useEffect(() => {
    let unmounted = false;

    const checkAuthAndNavigate = async () => {
      try {
        const testMode = await AsyncStorage.getItem('driver_test_mode');
        if (testMode === 'true') {
          if (!unmounted) router.replace('/(tabs)');
          return;
        }

        const proceed = (state: ReturnType<typeof useAuthStore.getState>) => {
          if (unmounted) return;
          if (state.isAuthenticated && state.user && state.token) {
            if (state.user.role === 'customer') {
              router.replace('/(customer)/my-orders');
            } else {
              router.replace('/(tabs)');
            }
          } else {
            router.replace('/(landing)/role-select');
          }
        };

        const state = useAuthStore.getState();
        if (state.isHydrated) {
          proceed(state);
        } else {
          const unsubscribe = useAuthStore.subscribe((nextState) => {
            if (nextState.isHydrated) {
              unsubscribe();
              proceed(nextState);
            }
          });
        }
      } catch {
        if (!unmounted) router.replace('/(landing)/role-select');
      }
    };

    checkAuthAndNavigate();

    return () => {
      unmounted = true;
    };
  }, []);

  return null;
}
