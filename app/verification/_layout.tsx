import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function VerificationLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.neutral[900],
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Verificaciones' }} />
      <Stack.Screen name="submit" options={{ title: 'Verificar identidad' }} />
    </Stack>
  );
}
