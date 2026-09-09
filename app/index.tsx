import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';

export default function Index() {
  const { isHydrated, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isHydrated) {
      console.log('[App:Startup] Auth State:', {
        isAuthenticated,
        role: user?.role,
        email: user?.email,
      });
    }
  }, [isHydrated, isAuthenticated, user]);

  if (!isHydrated) return null;

  if (isAuthenticated && user) {
    return <Redirect href={user.role === 'customer' ? '/(customer)/my-orders' : '/(tabs)'} />;
  }

  return <Redirect href="/(landing)/role-select" />;
}


