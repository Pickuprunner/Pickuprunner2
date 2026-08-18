import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blink } from '@/lib/blink';

export default function Index() {
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('app_role'),
      AsyncStorage.getItem('driver_test_mode'),
    ]).then(async ([role, testMode]) => {
      if (role === 'customer') {
        router.replace('/(customer)');
      } else if (role === 'driver') {
        // Test mode: skip auth + verification entirely
        if (testMode === 'true') {
          router.replace('/(tabs)');
          return;
        }
        // Check auth + verification before routing to tabs
        const me = await blink.auth.me().catch(() => null);
        if (!me) {
          router.replace('/sign-in');
          return;
        }
        const [verRows] = await Promise.all([
          blink.db.driverVerifications.list({ where: { user_id: me.id }, limit: 1 }),
        ]);
        const verification = verRows[0] as any;

        if (!verification || verification.status !== 'approved') {
          router.replace('/driver-verification');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/role-select');
      }
    }).catch(() => {
      router.replace('/role-select');
    });
  }, []);

  return null;
}
