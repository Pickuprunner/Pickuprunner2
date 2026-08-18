import React from 'react';
import { Stack } from 'expo-router';

export default function LandingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="role-select" />
    </Stack>
  );
}
