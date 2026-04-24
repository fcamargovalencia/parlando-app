import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react-native';
import { Screen, Button, Input } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { useRegisterScreen } from '@/hooks/screens/useRegisterScreen';

export default function RegisterScreen() {
  const router = useRouter();
  const { fields, errors, loading, error, clearError, updateField, handleRegister } =
    useRegisterScreen();

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-12 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center mb-6"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={Colors.neutral[600]} />
          </TouchableOpacity>

          <View className="mb-8">
            <Text className="text-3xl font-bold text-dark">Crear cuenta</Text>
            <Text className="text-base text-neutral-500 mt-1">
              Únete a la comunidad de viajes compartidos
            </Text>
          </View>

          {error && (
            <TouchableOpacity
              onPress={clearError}
              className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6"
            >
              <Text className="text-sm text-red-700">{error}</Text>
            </TouchableOpacity>
          )}

          <View className="gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Nombre"
                  placeholder="Juan"
                  autoComplete="given-name"
                  value={fields.firstName}
                  onChangeText={(v) => updateField('firstName', v)}
                  error={errors.firstName}
                  leftIcon={<User size={20} color={Colors.neutral[400]} />}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Apellido"
                  placeholder="Pérez"
                  autoComplete="family-name"
                  value={fields.lastName}
                  onChangeText={(v) => updateField('lastName', v)}
                  error={errors.lastName}
                />
              </View>
            </View>

            <Input
              label="Correo electrónico"
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoComplete="email"
              value={fields.email}
              onChangeText={(v) => updateField('email', v)}
              error={errors.email}
              leftIcon={<Mail size={20} color={Colors.neutral[400]} />}
            />

            <Input
              label="Teléfono"
              placeholder="3001234567"
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={10}
              value={fields.phone}
              onChangeText={(v) => updateField('phone', v.replace(/\D/g, ''))}
              error={errors.phone}
              hint="Número colombiano sin el +57"
              leftIcon={<Phone size={20} color={Colors.neutral[400]} />}
            />

            <Input
              label="Contraseña"
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              autoComplete="new-password"
              value={fields.password}
              onChangeText={(v) => updateField('password', v)}
              error={errors.password}
              leftIcon={<Lock size={20} color={Colors.neutral[400]} />}
            />

            <Input
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              secureTextEntry
              value={fields.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              error={errors.confirmPassword}
              leftIcon={<Lock size={20} color={Colors.neutral[400]} />}
            />
          </View>

          <Text className="text-xs text-neutral-400 text-center mt-6 leading-4">
            Al crear tu cuenta, aceptas nuestros Términos de Servicio y Política
            de Privacidad conforme a la Ley 1581 de 2012.
          </Text>

          <Button
            onPress={handleRegister}
            loading={loading}
            size="lg"
            className="w-full mt-6"
          >
            Crear cuenta
          </Button>

          <View className="flex-row items-center justify-center mt-6 mb-4">
            <Text className="text-sm text-neutral-500">¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-sm font-semibold text-primary-600">
                Inicia sesión
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
