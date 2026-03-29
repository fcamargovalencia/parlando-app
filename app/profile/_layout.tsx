import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function ProfileLayout() {
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
      <Stack.Screen name="edit" options={{ title: 'Editar perfil' }} />
      <Stack.Screen name="settings" options={{ title: 'Configuración' }} />
    </Stack>
  );
}
