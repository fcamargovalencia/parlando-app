import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Screen, Button } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { useVerifyPhone } from '@/hooks/useVerifyPhone';

export default function VerifyPhoneScreen() {
  const {
    phone,
    code,
    inputRefs,
    cooldown,
    sending,
    loading,
    error,
    isComplete,
    from,
    clearError,
    handleResend,
    handleChange,
    handleKeyPress,
    handleVerify,
    handleSkip,
    OTP_LENGTH,
  } = useVerifyPhone();

  return (
    <Screen>
      <View className="flex-1 px-6 pt-16 justify-between pb-8">
        <View>
          {/* Header */}
          <View className="mb-10">
            <Text className="text-3xl font-bold text-dark">Verifica tu teléfono</Text>
            <Text className="text-base text-neutral-500 mt-2 leading-5">
              Ingresa el código de 6 dígitos que enviamos a{' '}
              <Text className="font-semibold text-neutral-700">{phone || 'tu teléfono'}</Text>
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

          {/* OTP Inputs */}
          <View className="flex-row justify-between px-2">
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                className={`w-12 h-14 border-2 rounded-2xl text-center text-xl font-bold ${
                  digit ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 bg-white'
                }`}
                style={{ color: Colors.dark.DEFAULT }}
                keyboardType="number-pad"
                maxLength={index === 0 ? OTP_LENGTH : 1}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Resend */}
          <View className="flex-row items-center justify-center mt-8">
            <Text className="text-sm text-neutral-500">¿No recibiste el código? </Text>
            {cooldown > 0 ? (
              <Text className="text-sm font-semibold text-neutral-400">
                Reenviar en {cooldown}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={sending}>
                <Text className="text-sm font-semibold text-primary-600">
                  {sending ? 'Enviando...' : 'Reenviar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Actions */}
        <View>
          <Button
            onPress={handleVerify}
            loading={loading}
            disabled={!isComplete}
            size="lg"
            className="w-full"
          >
            Verificar
          </Button>
          <Button
            onPress={handleSkip}
            variant="ghost"
            size="md"
            className="w-full mt-3"
          >
            {from === 'profile' ? 'Cancelar' : 'Verificar después'}
          </Button>
        </View>
      </View>
    </Screen>
  );
}
