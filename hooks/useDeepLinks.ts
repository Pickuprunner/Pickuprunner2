import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

export function parseResetPasswordUrl(url: string): { userId?: string; token?: string } | null {
  if (!url || !url.includes('reset-password')) return null;

  // Path format: pickuprunner://auth/reset-password/:userId/:token or /reset-password/:userId/:token
  const pathMatch = url.match(/(?:auth\/)?reset-password\/([^/?#]+)\/([^/?#]+)/);
  if (pathMatch) {
    return {
      userId: decodeURIComponent(pathMatch[1]),
      token: decodeURIComponent(pathMatch[2]),
    };
  }

  // Query parameter format: ?userId=...&token=...
  if (url.includes('userId=') && url.includes('token=')) {
    const userIdMatch = url.match(/[?&]userId=([^&#]+)/);
    const tokenMatch = url.match(/[?&]token=([^&#]+)/);
    if (userIdMatch && tokenMatch) {
      return {
        userId: decodeURIComponent(userIdMatch[1]),
        token: decodeURIComponent(tokenMatch[1]),
      };
    }
  }

  return null;
}

export function useDeepLinks() {
  useEffect(() => {
    const handleUrl = (rawUrl: string | null) => {
      if (!rawUrl) return;
      const resetData = parseResetPasswordUrl(rawUrl);
      if (resetData?.userId && resetData?.token) {
        router.replace({
          pathname: '/(auth)/reset-password',
          params: {
            userId: resetData.userId,
            token: resetData.token,
          },
        });
      }
    };

    Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
