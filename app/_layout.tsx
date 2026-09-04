import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlinkProvider, createTamagui, tamaguiDefaultConfig, Theme, BlinkToastProvider } from '@blinkdotnew/mobile-ui';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { RealtimeProvider } from '@/components/RealtimeProvider';
import { setupNotificationHandler } from '@/lib/notifications';
import { NotificationProvider } from '@/context/NotificationContext';
import { colors } from '@/constants/design';
import { ToastProvider } from '@/components/core';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const config = createTamagui({
  ...tamaguiDefaultConfig,
  tokens: {
    ...tamaguiDefaultConfig.tokens,
    radius: {
      ...tamaguiDefaultConfig.tokens.radius,
      full: 9999,
    },
  },
});

function WebStyleReset() {
  if (Platform.OS !== 'web') return null;
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: 'input:focus,textarea:focus{outline:none!important}',
      }}
    />
  );
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  return (
    <BlinkProvider config={config} defaultTheme="dark">
      <Theme name="dark">
        <QueryClientProvider client={queryClient}>
          <NotificationProvider>
            <BlinkToastProvider>
              <ToastProvider>
                <RealtimeProvider />
                <WebStyleReset />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(landing)" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="(customer)" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="order/[id]" />
                  <Stack.Screen name="connect/onboarding/success" />
                  <Stack.Screen name="connect/onboarding/reauth" />
                  <Stack.Screen name="delete-account" />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
              </ToastProvider>
            </BlinkToastProvider>
          </NotificationProvider>
        </QueryClientProvider>
      </Theme>
    </BlinkProvider>
  );
}
