import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlinkProvider, createTamagui, tamaguiDefaultConfig, Theme, BlinkToastProvider } from '@blinkdotnew/mobile-ui';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { RealtimeProvider } from '@/components/RealtimeProvider';
// expo-notifications is native-only — importing it on web causes 401 network requests
// We lazy-import only when needed (inside the useEffect below)
import { getOrderIdFromNotification, getScreenFromNotification } from '@/lib/notifications';

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

  // Handle notification taps — navigate directly to the relevant order (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Lazy import to prevent web bundle from loading expo-notifications at startup
    import('expo-notifications').then((Notifications) => {
      const resolveNavigation = (response: any, delay = 0) => {
        const orderId = getOrderIdFromNotification(response);
        if (orderId) {
          const go = () => router.push(`/order/${orderId}`);
          delay ? setTimeout(go, delay) : go();
          return;
        }
        const screen = getScreenFromNotification(response);
        if (screen === 'chat') {
          const go = () => router.push('/(tabs)/chat');
          delay ? setTimeout(go, delay) : go();
        }
      };

      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        resolveNavigation(response);
      });

      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) return;
        resolveNavigation(response, 500);
      });

      return () => subscription.remove();
    });
  }, []);

  return (
    <BlinkProvider config={config} defaultTheme="dark">
      <Theme name="dark">
        <QueryClientProvider client={queryClient}>
          <BlinkToastProvider>
            <RealtimeProvider />
            <WebStyleReset />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="role-select" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(customer)" />
              <Stack.Screen name="order/[id]" />
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="driver-verification" />
              <Stack.Screen name="background-check" />
              <Stack.Screen name="terms" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </BlinkToastProvider>
        </QueryClientProvider>
      </Theme>
    </BlinkProvider>
  );
}
