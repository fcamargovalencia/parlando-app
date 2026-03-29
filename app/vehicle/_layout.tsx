import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function VehicleLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: Colors.dark.DEFAULT,
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mis vehículos' }} />
      <Stack.Screen name="add" options={{ title: 'Registrar vehículo' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle del vehículo' }} />
    </Stack>
  );
}
