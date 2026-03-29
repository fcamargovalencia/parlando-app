import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Spinner } from '@/components/ui';

export default function IndexScreen() {
  const router = useRouter();
  const { accessToken, hasOnboarded } = useAuthStore();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (accessToken) {
        router.replace('/(tabs)/home');
      } else if (hasOnboarded) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(auth)/welcome');
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [accessToken, hasOnboarded, router]);

  return <Spinner fullScreen message="Cargando..." />;
}
