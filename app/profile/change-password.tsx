import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Screen, Button, Input } from '@/components/ui';
import { useChangePassword } from '@/hooks/useChangePassword';

export default function ChangePasswordScreen() {
  const { form, submitting, error, setField, handleSubmit } = useChangePassword();

  return (
    <Screen safe={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-6 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="Contraseña actual"
            value={form.currentPassword}
            onChangeText={(v) => setField('currentPassword', v)}
            placeholder="Ingresa tu contraseña actual"
            secureTextEntry
            containerClassName="mb-4"
          />

          <Input
            label="Nueva contraseña"
            value={form.newPassword}
            onChangeText={(v) => setField('newPassword', v)}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            containerClassName="mb-4"
          />

          <Input
            label="Confirmar nueva contraseña"
            value={form.confirmPassword}
            onChangeText={(v) => setField('confirmPassword', v)}
            placeholder="Repite la nueva contraseña"
            secureTextEntry
            containerClassName="mb-6"
          />

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          <Button
            onPress={handleSubmit}
            loading={submitting}
            size="lg"
            className="w-full"
          >
            Cambiar contraseña
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
