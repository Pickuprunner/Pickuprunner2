import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useRole } from '@/hooks/useRole';
import { AppSplashScreen, showGlobalToast } from '@/components/core';

export default function Index() {
  const { isHydrated, isAuthenticated, user } = useAuthStore();
  const { role: savedRole, isLoading: isRoleLoading } = useRole();

  useEffect(() => {
    if (isHydrated) {
      console.log('[App:Startup] Auth State:', {
        isAuthenticated,
        role: user?.role,
        email: user?.email,
        savedRole,
      });
    }
  }, [isHydrated, isAuthenticated, user, savedRole]);

  if (!isHydrated || isRoleLoading) {
    return <AppSplashScreen />;
  }

  if (isAuthenticated && user) {
    if (user.status === 'suspended') {
      showGlobalToast('Your account has been suspended. Please contact support.', 'error');
      useAuthStore.getState().clearSession();
      return <Redirect href="/(landing)/role-select" />;
    }

    if (user.role === 'dev') {
      if (savedRole === 'customer') {
        return <Redirect href="/(customer)/my-orders" />;
      }
      if (savedRole === 'driver') {
        return <Redirect href="/(tabs)" />;
      }
      return <Redirect href="/(landing)/role-select" />;
    }

    return <Redirect href={user.role === 'customer' ? '/(customer)/my-orders' : '/(tabs)'} />;
  }

  return <Redirect href="/(landing)/role-select" />;
}



