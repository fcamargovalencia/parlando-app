import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function RoutineLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.dark.DEFAULT,
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="create" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="[id]/subscriptions" options={{ title: 'Suscripciones' }} />
      <Stack.Screen name="[id]/occurrences" options={{ title: 'Ocurrencias' }} />
      <Stack.Screen name="[id]/occurrence" options={{ headerShown: false }} />
    </Stack>
  );
}
