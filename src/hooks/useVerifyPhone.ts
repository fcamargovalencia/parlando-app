import { useState, useRef, useEffect, useCallback } from 'react';
import { TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth-store';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export function useVerifyPhone() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
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

  const handleChange = useCallback(
    (text: string, index: number) => {
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
    },
    [code],
  );

  const handleKeyPress = useCallback(
    (e: { nativeEvent: { key: string } }, index: number) => {
      if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code],
  );

  const otpValue = code.join('');
  const isComplete = otpValue.length === OTP_LENGTH;

  const navigateAfterVerify = useCallback(() => {
    if (from === 'profile') router.back();
    else router.replace('/(tabs)/home');
  }, [from, router]);

  const handleVerify = useCallback(async () => {
    if (!isComplete) return;
    const success = await verifyPhone(otpValue);
    if (success) navigateAfterVerify();
  }, [isComplete, verifyPhone, otpValue, navigateAfterVerify]);

  const handleSkip = useCallback(() => {
    navigateAfterVerify();
  }, [navigateAfterVerify]);

  return {
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
  };
}
