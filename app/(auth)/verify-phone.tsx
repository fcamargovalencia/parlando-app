import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/colors';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string; }>();
  const { loading, error, sendOtp, verifyPhone, clearError } = useAuth();
  const phone = useAuthStore((s) => s.user?.phone ?? '');

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [sending, setSending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Send OTP on mount
  useEffect(() => {
    sendOtp();
  }, [sendOtp]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    await sendOtp();
    setSending(false);
    setCooldown(RESEND_COOLDOWN);
    setCode(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  }, [cooldown, sending, sendOtp]);

  const handleChange = (text: string, index: number) => {
    if (text.length > 1) {
      const chars = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const newCode = [...code];
      chars.forEach((c, i) => {
        if (index + i < OTP_LENGTH) newCode[index + i] = c;
      });
      setCode(newCode);
      const targetIdx = Math.min(index + chars.length, OTP_LENGTH - 1);
      if (targetIdx === OTP_LENGTH - 1 && newCode[OTP_LENGTH - 1]) {
        inputRefs.current[targetIdx]?.blur();
      } else {
        inputRefs.current[targetIdx]?.focus();
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = text.replace(/\D/g, '');
    setCode(newCode);

    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (text && index === OTP_LENGTH - 1) {
      inputRefs.current[index]?.blur();
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string; }; }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const otpValue = code.join('');
  const isComplete = otpValue.length === OTP_LENGTH;

  const handleVerify = async () => {
    if (!isComplete) return;
    const success = await verifyPhone(otpValue);
    if (success) {
      if (from === 'profile') {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }
    }
  };

  const handleSkip = () => {
    if (from === 'profile') {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <Screen>
      <View className="flex-1 px-6 pt-16 justify-between pb-8">
        <View>
          {/* Header */}
          <View className="mb-10">
            <Text className="text-3xl font-bold text-dark">Verifica tu teléfono</Text>
            <Text className="text-base text-neutral-500 mt-2 leading-5">
              Ingresa el código de 6 dígitos que enviamos a{' '}
              <Text className="font-semibold text-neutral-700">
                {phone || 'tu teléfono'}
              </Text>
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
                className={`w-12 h-14 border-2 rounded-2xl text-center text-xl font-bold ${digit
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 bg-white'
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
