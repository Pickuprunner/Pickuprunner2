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

        const proceed = async (state: ReturnType<typeof useAuthStore.getState>) => {
          if (unmounted) return;
          console.log('[App:Startup] Auth State:', {
            isHydrated: state.isHydrated,
            isAuthenticated: state.isAuthenticated,
            role: state.user?.role,
            email: state.user?.email,
          });

          if (state.isAuthenticated && state.user && state.token) {
            if (state.user.role === 'customer') {
              console.log('[App:Startup] Routing customer to /(customer)/my-orders');
              router.replace('/(customer)/my-orders');
            } else if (state.user.role === 'admin') {
              console.log('[App:Startup] Routing admin to /(tabs)');
              router.replace('/(tabs)');
            } else {
              try {
                const { accreditationApi } = await import('@/apis/accreditation');
                const accred = await accreditationApi.getAccreditation().catch(() => null);
                const status = accred?.data?.profile?.accreditationStatus;

                if (status === 'not_started' || (!status && !accred?.data?.profile)) {
                  console.log('[App:Startup] Routing new driver to /(auth)/driver-verification');
                  router.replace('/(auth)/driver-verification');
                } else {
                  console.log(`[App:Startup] Routing driver (${status || 'under_review'}) to /(tabs)`);
                  router.replace('/(tabs)');
                }
              } catch {
                router.replace('/(tabs)');
              }
            }
          } else {
            console.log('[App:Startup] Routing unauthenticated user to /(landing)/role-select');
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
