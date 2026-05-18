import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { Screen, Button, Input } from '@/components/ui';
import { authApi } from '@/api/auth';
import { extractApiError } from '@/lib/utils';
import { Colors } from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isValid = email.includes('@') && email.includes('.');

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.requestPasswordReset({ email: email.trim() });
      setSent(true);
    } catch (err) {
      const msg = extractApiError(err, 'Error al enviar instrucciones');
      // Si la cuenta está vinculada con Google, mostrar mensaje descriptivo
      if (msg.toLowerCase().includes('google')) {
        setError('Esta cuenta usa Google Sign-In. Inicia sesión con el botón de Google.');
      } else {
        // Por seguridad mostramos el mensaje de éxito de todas formas
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

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

          {sent ? (
            /* ── Estado de confirmación ── */
            <View className="flex-1 items-center justify-center pt-10">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-6"
                style={{ backgroundColor: Colors.primary[50] }}
              >
                <CheckCircle size={44} color={Colors.primary[500]} />
              </View>
              <Text className="text-2xl font-bold text-neutral-900 text-center mb-3">
                Revisa tu email
              </Text>
              <Text className="text-base text-neutral-500 text-center leading-6 px-4">
                Si el correo <Text className="font-semibold text-neutral-700">{email}</Text> está
                registrado, recibirás instrucciones para restablecer tu contraseña en unos minutos.
              </Text>
              <Text className="text-sm text-neutral-400 text-center mt-4 px-4">
                Revisa también tu carpeta de spam.
              </Text>
              <Button
                onPress={() => router.replace('/(auth)/login')}
                variant="outline"
                size="lg"
                className="w-full mt-10"
              >
                Volver al inicio de sesión
              </Button>
            </View>
          ) : (
            /* ── Formulario ── */
            <>
              <View className="mb-10">
                <Text className="text-3xl font-bold text-dark">¿Olvidaste tu contraseña?</Text>
                <Text className="text-base text-neutral-500 mt-2 leading-6">
                  Ingresa tu correo electrónico y te enviaremos instrucciones para restablecerla.
                </Text>
              </View>

              {error && (
                <TouchableOpacity
                  onPress={() => setError(null)}
                  className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6"
                >
                  <Text className="text-sm text-red-700">{error}</Text>
                </TouchableOpacity>
              )}

              <View className="gap-4">
                <Input
                  label="Correo electrónico"
                  placeholder="tu@email.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  leftIcon={<Mail size={20} color={Colors.neutral[400]} />}
                />
              </View>

              <Button
                onPress={handleSubmit}
                loading={loading}
                disabled={!isValid}
                size="lg"
                className="w-full mt-8"
              >
                Enviar instrucciones
              </Button>

              <TouchableOpacity
                onPress={() => router.back()}
                className="items-center mt-6"
              >
                <Text className="text-sm text-primary-600 font-medium">
                  Volver al inicio de sesión
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
