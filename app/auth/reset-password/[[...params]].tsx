import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function AuthResetPasswordCatchAll() {
  const searchParams = useLocalSearchParams();

  let userId = typeof searchParams.userId === 'string' ? searchParams.userId : '';
  let token = typeof searchParams.token === 'string' ? searchParams.token : '';

  const pathSegments = Array.isArray(searchParams.params)
    ? searchParams.params
    : typeof searchParams.params === 'string'
    ? [searchParams.params]
    : [];

  if (!userId && pathSegments.length > 0) {
    userId = pathSegments[0];
  }
  if (!token && pathSegments.length > 1) {
    token = pathSegments.slice(1).join('/');
  }

  const role = typeof searchParams.role === 'string' ? searchParams.role : undefined;

  return (
    <Redirect
      href={{
        pathname: '/(auth)/reset-password',
        params: {
          ...(userId ? { userId } : {}),
          ...(token ? { token } : {}),
          ...(role ? { role } : {}),
        },
      } as any}
    />
  );
}
