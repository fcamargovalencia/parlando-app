import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/api/auth';
import { isTokenExpired } from '@/lib/jwt';
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation';
import { Spinner } from '@/components/ui';

export default function IndexScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { navigate } = useNotificationNavigation();

  useEffect(() => {
    // Wait for Zustand persist to finish hydrating from SecureStore before
    // reading any auth state. This replaces the fragile 300 ms setTimeout.
    const unsubscribe = useAuthStore.persist.onFinishHydration(async () => {
      setReady(true);
    });

    // If the store was already hydrated before this component mounted (can
    // happen on fast re-renders), onFinishHydration won't fire again.
    if (useAuthStore.persist.hasHydrated()) {
      setReady(true);
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      const { accessToken, refreshToken, hasOnboarded, logout, setTokens } =
        useAuthStore.getState();

      if (!accessToken) {
        router.replace(hasOnboarded ? '/(auth)/login' : '/(auth)/welcome');
        return;
      }

      // Access token is present — check expiration before trusting it.
      if (!isTokenExpired(accessToken)) {
        router.replace('/(tabs)/home');

        // Cold start: check if the app was opened by tapping a notification
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          navigate(lastResponse);
        }
        return;
      }

      // Access token expired — attempt a proactive silent refresh.
      if (refreshToken) {
        try {
          const { data: res } = await authApi.refresh(refreshToken);
          const data = res.data?.accessToken
            ? res.data
            : (res as unknown as { data: { accessToken: string; refreshToken: string; }; }).data;

          if (data?.accessToken && data?.refreshToken) {
            setTokens(data.accessToken, data.refreshToken);
            router.replace('/(tabs)/home');

            // Cold start after silent refresh
            const lastResponse = await Notifications.getLastNotificationResponseAsync();
            if (lastResponse) {
              navigate(lastResponse);
            }
            return;
          }
        } catch {
          // Refresh failed — fall through to logout
        }
      }

      // Both tokens invalid — clear session and send to auth.
      logout();
      router.replace(hasOnboarded ? '/(auth)/login' : '/(auth)/welcome');
    })();
  }, [ready, router, navigate]);

  return <Spinner fullScreen message="Cargando..." />;
}
