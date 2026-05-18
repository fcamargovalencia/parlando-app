import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Mail, X } from 'lucide-react-native';
import { authApi } from '@/api/auth';
import { Colors } from '@/constants/colors';
import type { UserResponse } from '@/types/api';

const RESEND_COOLDOWN_MS = 60_000; // 60 segundos

interface EmailVerificationBannerProps {
  user: UserResponse;
}

export function EmailVerificationBanner({ user }: EmailVerificationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [cooldown, setCooldown] = useState(0); // segundos restantes
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // No mostrar para cuentas Google, email ya verificado, o si fue descartado
  if (
    user.provider === 'GOOGLE' ||
    user.emailVerified ||
    dismissed
  ) {
    return null;
  }

  const startCooldown = () => {
    setCooldown(60);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    try {
      await authApi.resendEmailVerification();
      startCooldown();
    } catch {
      // Silencioso — el usuario puede reintentar
    } finally {
      setSending(false);
    }
  };

  return (
    <View
      className="mx-5 mb-4 rounded-2xl px-4 py-3 flex-row items-start gap-3"
      style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' }}
    >
      <View className="mt-0.5">
        <Mail size={18} color="#D97706" />
      </View>

      <View className="flex-1">
        <Text className="text-sm font-semibold text-amber-800 mb-0.5">
          Verifica tu correo electrónico
        </Text>
        <Text className="text-xs text-amber-700 leading-4">
          Revisa tu bandeja de entrada y confirma tu email para acceder a todas las funcionalidades.
        </Text>

        <TouchableOpacity
          onPress={handleResend}
          disabled={cooldown > 0 || sending}
          className="mt-2 self-start"
          activeOpacity={0.7}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: cooldown > 0 ? Colors.neutral[400] : '#D97706' }}
          >
            {sending
              ? 'Enviando...'
              : cooldown > 0
                ? `Reenviar en ${cooldown}s`
                : 'Reenviar email'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => setDismissed(true)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <X size={16} color={Colors.neutral[400]} />
      </TouchableOpacity>
    </View>
  );
}
