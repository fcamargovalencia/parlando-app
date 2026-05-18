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
  const { token } = useLocalSearchParams<{ token: string; }>();
  const setUser = useAuthStore((s) => s.setUser);

  const [state, setState] = useState<VerifyState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('Token de verificación no encontrado.');
      return;
    }

    authApi.verifyEmail(token)
      .then(async () => {
        // Refrescar perfil para que emailVerified = true en el store
        try {
          const { data: meRes } = await usersApi.getMe();
          if (meRes.data) setUser(meRes.data);
        } catch {
          // Si falla el refresh del perfil, el banner desaparecerá en el próximo focus
        }
        setState('success');
      })
      .catch((err) => {
        setErrorMsg(extractApiError(err, 'El enlace de verificación es inválido o ha expirado.'));
        setState('error');
      });
  }, [token, setUser]);

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
              onPress={() => router.replace('/(auth)/login')}
              variant="outline"
              size="lg"
              className="w-full mb-3"
            >
              Ir al inicio de sesión
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
