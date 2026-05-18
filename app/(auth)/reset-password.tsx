import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Screen, Button, Input } from '@/components/ui';
import { authApi } from '@/api/auth';
import { extractApiError } from '@/lib/utils';
import { Colors } from '@/constants/colors';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string; }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const isValid = newPassword.length >= 8 && confirmPassword.length >= 8 && passwordsMatch;

  const handleSubmit = async () => {
    if (!isValid || !token) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.confirmPasswordReset({ token, newPassword });
      Toast.show({
        type: 'success',
        text1: 'Contraseña actualizada',
        text2: 'Ya puedes iniciar sesión con tu nueva contraseña.',
      });
      setSuccess(true);
    } catch (err) {
      const msg = extractApiError(err, 'Error al restablecer la contraseña');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-neutral-800 text-center mb-4">
            Enlace inválido
          </Text>
          <Text className="text-sm text-neutral-500 text-center mb-8">
            Este enlace no es válido o ha expirado. Solicita uno nuevo.
          </Text>
          <Button onPress={() => router.replace('/(auth)/forgot-password')} size="lg" className="w-full">
            Solicitar nuevo enlace
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-16 pb-8 flex-grow"
          keyboardShouldPersistTaps="always"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center mb-6"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={Colors.neutral[600]} />
          </TouchableOpacity>

          {success ? (
            /* ── Estado de éxito ── */
            <View className="flex-1 items-center justify-center pt-10">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-6"
                style={{ backgroundColor: Colors.primary[50] }}
              >
                <CheckCircle size={44} color={Colors.primary[500]} />
              </View>
              <Text className="text-2xl font-bold text-neutral-900 text-center mb-3">
                ¡Contraseña actualizada!
              </Text>
              <Text className="text-base text-neutral-500 text-center leading-6 px-4">
                Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.
              </Text>
              <Button
                onPress={() => router.replace('/(auth)/login')}
                size="lg"
                className="w-full mt-10"
              >
                Iniciar sesión
              </Button>
            </View>
          ) : (
            /* ── Formulario ── */
            <>
              <View className="mb-10">
                <Text className="text-3xl font-bold text-dark">Nueva contraseña</Text>
                <Text className="text-base text-neutral-500 mt-2 leading-6">
                  Crea una contraseña segura de al menos 8 caracteres.
                </Text>
              </View>

              {error && (
                <TouchableOpacity
                  onPress={() => setError(null)}
                  className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6"
                >
                  <Text className="text-sm text-red-700">{error}</Text>
                  {(error.toLowerCase().includes('expir') || error.toLowerCase().includes('inválid') || error.toLowerCase().includes('utilizado')) && (
                    <TouchableOpacity
                      onPress={() => router.replace('/(auth)/forgot-password')}
                      className="mt-2"
                    >
                      <Text className="text-sm font-semibold text-red-600 underline">
                        Solicitar nuevo enlace
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              )}

              <View className="gap-4">
                <Input
                  label="Nueva contraseña"
                  placeholder="Mínimo 8 caracteres"
                  secureTextEntry
                  autoComplete="new-password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  leftIcon={<Lock size={20} color={Colors.neutral[400]} />}
                />
                <Input
                  label="Confirmar contraseña"
                  placeholder="Repite la contraseña"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  error={
                    confirmPassword.length > 0 && !passwordsMatch
                      ? 'Las contraseñas no coinciden'
                      : undefined
                  }
                  leftIcon={<Lock size={20} color={Colors.neutral[400]} />}
                />
              </View>

              <Button
                onPress={handleSubmit}
                loading={loading}
                disabled={!isValid}
                size="lg"
                className="w-full mt-8"
              >
                Guardar contraseña
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
