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
import { Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react-native';
import { Screen, Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { APP } from '@/constants/config';

export default function RegisterScreen() {
  const router = useRouter();
  const { loading, error, register, clearError } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Nombre requerido';
    if (!form.lastName.trim()) e.lastName = 'Apellido requerido';
    if (!form.email.includes('@')) e.email = 'Email inválido';
    if (!/^\d{10}$/.test(form.phone)) e.phone = 'Ingresa 10 dígitos';
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const success = await register({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: `${APP.PHONE_PREFIX}${form.phone}`,
      password: form.password,
    });
    if (success) {
      router.replace('/(auth)/verify-phone');
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
          contentContainerClassName="px-6 pt-12 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center mb-6"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={Colors.neutral[600]} />
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-dark">Crear cuenta</Text>
            <Text className="text-base text-neutral-500 mt-1">
              Únete a la comunidad de viajes compartidos
            </Text>
          </View>

          {/* Server error */}
          {error && (
            <TouchableOpacity
              onPress={clearError}
              className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6"
            >
              <Text className="text-sm text-red-700">{error}</Text>
            </TouchableOpacity>
          )}

          {/* Form */}
          <View className="gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Nombre"
                  placeholder="Juan"
                  autoComplete="given-name"
                  value={form.firstName}
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
                  value={form.lastName}
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
              value={form.email}
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
              value={form.phone}
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
              value={form.password}
              onChangeText={(v) => updateField('password', v)}
              error={errors.password}
              leftIcon={<Lock size={20} color={Colors.neutral[400]} />}
            />

            <Input
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              secureTextEntry
              value={form.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              error={errors.confirmPassword}
              leftIcon={<Lock size={20} color={Colors.neutral[400]} />}
            />
          </View>

          {/* Terms */}
          <Text className="text-xs text-neutral-400 text-center mt-6 leading-4">
            Al crear tu cuenta, aceptas nuestros Términos de Servicio y Política
            de Privacidad conforme a la Ley 1581 de 2012.
          </Text>

          {/* Submit */}
          <Button
            onPress={handleRegister}
            loading={loading}
            size="lg"
            className="w-full mt-6"
          >
            Crear cuenta
          </Button>

          {/* Login link */}
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
