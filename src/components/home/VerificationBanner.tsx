import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { UserResponse } from '@/types/api';

interface VerificationBannerProps {
  user: UserResponse;
  onPress: () => void;
}

export function VerificationBanner({ user, onPress }: VerificationBannerProps) {
  const isNone = user.verificationLevel === 'NONE';

  const gradientColors: [string, string] = isNone
    ? ['#ff3b30', '#ff7f50']
    : ['#ffb300', '#ffe082'];

  const textColor = isNone ? '#fff' : '#7a4f01';
  const buttonBg = isNone ? '#fff' : '#ffb300';
  const buttonTextColor = isNone ? '#ff3b30' : '#7a4f01';

  return (
    <View className="mb-5">
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16 }}
      >
        <Text className="text-sm font-bold mb-1.5" style={{ color: textColor }}>
          {isNone ? '¡Verificación requerida!' : 'Verifica tu identidad'}
        </Text>
        <Text className="text-xs leading-5 mb-3" style={{ color: textColor }}>
          {isNone
            ? 'Debes verificar tu identidad y teléfono para usar la app.'
            : 'Completa la verificación para acceder a todas las funcionalidades.'}
        </Text>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          className="self-start px-4 py-1.5 rounded-xl"
          style={{ backgroundColor: buttonBg }}
        >
          <Text className="font-semibold text-xs" style={{ color: buttonTextColor }}>
            {isNone ? 'Verificar ahora' : 'Mejorar verificación'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}
