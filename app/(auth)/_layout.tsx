import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="customer-auth" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="driver-verification" />
      <Stack.Screen name="background-check" />
    </Stack>
  );
}
