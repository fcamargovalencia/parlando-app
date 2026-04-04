import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.neutral[50] },
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
