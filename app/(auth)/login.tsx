import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, ArrowLeft } from 'lucide-react-native';
import { Screen, Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { loading, error, login, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isValid = email.includes('@') && password.length >= 8;

  const handleLogin = async () => {
    if (!isValid) return;
    const success = await login({ email: email.trim(), password });
    if (success) {
      router.replace('/(tabs)/home');
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
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center mb-6"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={Colors.neutral[600]} />
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-10">
            <Text className="text-3xl font-bold text-dark">Bienvenido</Text>
            <Text className="text-base text-neutral-500 mt-1">
              Inicia sesión en tu cuenta ParlAndo
            </Text>
          </View>

          {/* Error */}
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
            <Input
              label="Correo electrónico"
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              leftIcon={<Mail size={20} color={Colors.neutral[400]} />}
            />

            <Input
              label="Contraseña"
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              leftIcon={<Lock size={20} color={Colors.neutral[400]} />}
            />
          </View>

          {/* Submit */}
          <Button
            onPress={handleLogin}
            loading={loading}
            disabled={!isValid}
            size="lg"
            className="w-full mt-8"
          >
            Iniciar sesión
          </Button>

          {/* Links */}
          <View className="flex-row items-center justify-center mt-8">
            <Text className="text-sm text-neutral-500">¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-sm font-semibold text-primary-600">
                Regístrate
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
