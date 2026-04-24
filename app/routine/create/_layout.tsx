import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

function BackToPreviousButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={{ paddingRight: 8 }}>
      <ChevronLeft size={24} color={Colors.dark.DEFAULT} />
    </TouchableOpacity>
  );
}

export default function CreateRoutineLayout() {
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
      <Stack.Screen
        name="step-1-route"
        options={{ title: 'Paso 1 de 4 — Ruta', headerLeft: () => <BackToPreviousButton /> }}
      />
      <Stack.Screen name="step-2-schedule" options={{ title: 'Paso 2 de 4 — Horario' }} />
      <Stack.Screen name="step-3-seats" options={{ title: 'Paso 3 de 4 — Cupos y precio' }} />
      <Stack.Screen name="step-4-pickup-config" options={{ title: 'Paso 4 de 4 — Recogida' }} />
      <Stack.Screen name="review" options={{ title: 'Revisar y publicar' }} />
      <Stack.Screen name="step-5-waypoints" options={{ title: 'Paradas predefinidas' }} />
    </Stack>
  );
}
