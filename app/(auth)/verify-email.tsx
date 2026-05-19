import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { Screen, Button } from '@/components/ui';
import { authApi } from '@/api/auth';
import { usersApi } from '@/api/users';
import { useAuthStore } from '@/stores/auth-store';
import { extractApiError } from '@/lib/utils';
import { Colors } from '@/constants/colors';

type VerifyState = 'loading' | 'success' | 'error';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token, error: errorParam } = useLocalSearchParams<{ token?: string; error?: string; }>();
  const setUser = useAuthStore((s) => s.setUser);

  const [state, setState] = useState<VerifyState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (errorParam) {
      setErrorMsg('El enlace de verificación es inválido o ha expirado.');
      setState('error');
      return;
    }

    if (!token) {
      setState('error');
      setErrorMsg('Token de verificación no encontrado.');
      return;
    }

    const refreshAndSucceed = async () => {
      try {
        const { data: meRes } = await usersApi.getMe();
        if (meRes.data) setUser(meRes.data);
      } catch { }
      setState('success');
    };

    authApi.verifyEmail(token)
      .then(() => refreshAndSucceed())
      .catch(async (err) => {
        // The backend returns 302 → parlando:// deep link on success.
        // React Native's network layer follows the redirect natively; axios
        // never sees the 302 and instead receives a network error (no response).
        // That means !err.response === true only when the backend redirected
        // (i.e. verification succeeded). A real API error always has err.response.
        if (!err.response) {
          await refreshAndSucceed();
          return;
        }
        setErrorMsg(extractApiError(err, 'El enlace de verificación es inválido o ha expirado.'));
        setState('error');
      });
  }, [token, errorParam, setUser]);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-6">
        {state === 'loading' && (
          <>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text className="text-base text-neutral-500 mt-6">Verificando tu correo...</Text>
          </>
        )}

        {state === 'success' && (
          <>
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: Colors.primary[50] }}
            >
              <CheckCircle size={52} color={Colors.primary[500]} />
            </View>
            <Text className="text-2xl font-bold text-neutral-900 text-center mb-3">
              ¡Email verificado!
            </Text>
            <Text className="text-base text-neutral-500 text-center leading-6">
              Tu correo electrónico ha sido verificado correctamente.
            </Text>
            <Button
              onPress={() =>
                router.replace(isAuthenticated ? '/(tabs)/home' : '/(auth)/login')
              }
              size="lg"
              className="w-full mt-10"
            >
              {isAuthenticated ? 'Ir al inicio' : 'Iniciar sesión'}
            </Button>
          </>
        )}

        {state === 'error' && (
          <>
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: '#FEF2F2' }}
            >
              <XCircle size={52} color="#EF4444" />
            </View>
            <Text className="text-2xl font-bold text-neutral-900 text-center mb-3">
              Verificación fallida
            </Text>
            <Text className="text-base text-neutral-500 text-center leading-6 mb-8">
              {errorMsg}
            </Text>
            <Button
              onPress={() =>
                router.replace(isAuthenticated ? '/(tabs)/home' : '/(auth)/login')
              }
              variant="outline"
              size="lg"
              className="w-full mb-3"
            >
              {isAuthenticated ? 'Volver al inicio' : 'Ir al inicio de sesión'}
            </Button>
            {isAuthenticated && (
              <Button
                onPress={async () => {
                  try {
                    await authApi.resendEmailVerification();
                  } catch { }
                  router.replace('/(tabs)/home');
                }}
                variant="ghost"
                size="lg"
                className="w-full"
              >
                Reenviar email de verificación
              </Button>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
