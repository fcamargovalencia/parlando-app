import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/api/users';

export function useProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { logout } = useAuth();

  useFocusEffect(
    useCallback(() => {
      if (user && !user.emailVerified) {
        usersApi.getMe()
          .then(({ data: res }) => { if (res.data) setUser(res.data); })
          .catch(() => { });
      }
    }, [user, setUser]),
  );

  const handleEdit = useCallback(() => {
    router.push('/profile/edit');
  }, [router]);

  const handleLogout = useCallback(() => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }, [logout, router]);

  return {
    user,
    handleEdit,
    handleLogout,
  };
}
