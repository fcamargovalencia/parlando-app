import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Banknote, KeyRound, CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { Avatar, ModalDragHandle } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { formatCurrency } from '@/lib/utils';
import { extractApiError } from '@/lib/utils';
import type { BookingResponse, PaymentMethod } from '@/types/api';

// ── Payment method options ──

const PRIMARY_METHODS: { value: PaymentMethod; label: string; }[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'NEQUI', label: 'Nequi' },
  { value: 'DAVIPLATA', label: 'Daviplata' },
  { value: 'BANCOLOMBIA', label: 'Bancolombia' },
  { value: 'BRE_B', label: 'Bre-B' },
];

const SECONDARY_METHODS: { value: PaymentMethod; label: string; }[] = [
  { value: 'PSE', label: 'PSE' },
  { value: 'CREDIT_CARD', label: 'Tarjeta crédito' },
  { value: 'DEBIT_CARD', label: 'Tarjeta débito' },
];

// ── Props ──

interface BoardPassengerModalProps {
  visible: boolean;
  booking: BookingResponse;
  pricePerSeat: number;
  currency: string;
  onConfirm: (verificationCode: string, paymentMethod: PaymentMethod) => Promise<void>;
  onDismiss: () => void;
}

export function BoardPassengerModal({
  visible,
  booking,
  pricePerSeat,
  currency,
  onConfirm,
  onDismiss,
}: BoardPassengerModalProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const isAndroid = Platform.OS === 'android';
  const keyboardOpen = keyboardHeight > 0;

  const [code, setCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passenger = booking.passenger;
  const totalAmount = pricePerSeat * booking.seatsBooked;

  const reset = useCallback(() => {
    setCode('');
    setPaymentMethod(null);
    setLoading(false);
    setError(null);
  }, []);

  const handleDismiss = useCallback(() => {
    if (loading) return;
    reset();
    onDismiss();
  }, [loading, reset, onDismiss]);

  const handleConfirm = useCallback(async () => {
    if (!paymentMethod) {
      setError('Selecciona el método de pago');
      return;
    }
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 1) {
      setError('Ingresa el código del pasajero');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onConfirm(trimmed, paymentMethod);
      reset();
    } catch (err) {
      const msg = extractApiError(err, 'No se pudo registrar el abordaje');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [code, paymentMethod, onConfirm, reset]);

  const canConfirm = code.trim().length > 0 && paymentMethod !== null && !loading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        behavior={isAndroid ? undefined : 'padding'}
        className="flex-1"
        style={isAndroid ? { paddingBottom: keyboardHeight } : undefined}
      >
        {/* Backdrop */}
        <TouchableOpacity
          className="flex-1"
          style={{ backgroundColor: Colors.overlay }}
          activeOpacity={1}
          onPress={handleDismiss}
        />

        {/* Sheet */}
        <View
          className="bg-white rounded-t-3xl px-6 pt-4"
          style={{ paddingBottom: keyboardOpen ? 16 : Math.max(insets.bottom, 16) + 8 }}
        >
          <ModalDragHandle />

          {/* Close button */}
          <TouchableOpacity
            onPress={handleDismiss}
            disabled={loading}
            className="absolute right-5 top-4 w-9 h-9 items-center justify-center rounded-full bg-neutral-100"
          >
            <X size={18} color={Colors.neutral[500]} />
          </TouchableOpacity>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Passenger info */}
            <View className="items-center mb-5 mt-1">
              <Avatar
                uri={passenger?.profilePhotoUrl ?? null}
                firstName={passenger?.firstName ?? '?'}
                lastName={passenger?.lastName ?? ''}
                size="lg"
              />
              <Text className="text-lg font-bold text-neutral-900 mt-3 text-center">
                {passenger ? `${passenger.firstName} ${passenger.lastName}` : 'Pasajero'}
              </Text>
              <Text className="text-sm text-neutral-500 mt-0.5 text-center">
                {booking.seatsBooked} {booking.seatsBooked === 1 ? 'asiento' : 'asientos'}
              </Text>
            </View>

            {/* Amount to collect */}
            <View
              className="flex-row items-center justify-between rounded-2xl px-5 py-4 mb-5"
              style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
            >
              <View className="flex-row items-center gap-2">
                <Banknote size={18} color={Colors.primary[600]} />
                <Text className="text-sm font-medium text-neutral-600">Cobrar</Text>
              </View>
              <Text className="text-xl font-bold" style={{ color: Colors.primary[700] }}>
                {formatCurrency(totalAmount, currency)}
              </Text>
            </View>

            {/* Verification code input */}
            <View className="mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <KeyRound size={15} color={Colors.neutral[500]} />
                <Text className="text-sm font-semibold text-neutral-700">
                  Código del pasajero
                </Text>
              </View>
              <TextInput
                value={code}
                onChangeText={(v) => {
                  setCode(v.toUpperCase());
                  setError(null);
                }}
                placeholder="Ej: A3F8K2"
                placeholderTextColor={Colors.neutral[400]}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
                style={{
                  backgroundColor: Colors.neutral[50],
                  borderWidth: 1,
                  borderColor: error ? '#EF4444' : Colors.neutral[200],
                  borderRadius: 14,
                  padding: 14,
                  fontSize: 22,
                  fontWeight: '700',
                  letterSpacing: 6,
                  color: Colors.neutral[900],
                  textAlign: 'center',
                  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                }}
              />
            </View>

            {/* Payment method selector */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-neutral-700 mb-2">
                Método de pago
              </Text>
              {/* Primary methods */}
              <View className="flex-row flex-wrap gap-2 mb-2">
                {PRIMARY_METHODS.map((m) => {
                  const selected = paymentMethod === m.value;
                  return (
                    <TouchableOpacity
                      key={m.value}
                      onPress={() => {
                        setPaymentMethod(m.value);
                        setError(null);
                      }}
                      disabled={loading}
                      className="px-4 py-2 rounded-full"
                      style={{
                        backgroundColor: selected ? Colors.primary[600] : Colors.neutral[100],
                        borderWidth: 1,
                        borderColor: selected ? Colors.primary[600] : Colors.neutral[200],
                      }}
                    >
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: selected ? 'white' : Colors.neutral[700] }}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* Secondary methods */}
              <View className="flex-row flex-wrap gap-2">
                {SECONDARY_METHODS.map((m) => {
                  const selected = paymentMethod === m.value;
                  return (
                    <TouchableOpacity
                      key={m.value}
                      onPress={() => {
                        setPaymentMethod(m.value);
                        setError(null);
                      }}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: selected ? Colors.primary[600] : 'white',
                        borderWidth: 1,
                        borderColor: selected ? Colors.primary[600] : Colors.neutral[300],
                      }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: selected ? 'white' : Colors.neutral[600] }}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Inline error */}
            {error ? (
              <Text className="text-red-500 text-xs text-center mb-3">{error}</Text>
            ) : null}

            {/* Confirm button */}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!canConfirm}
              style={{
                backgroundColor: canConfirm ? Colors.primary[600] : Colors.neutral[200],
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 4,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <CheckCircle2
                    size={18}
                    color={canConfirm ? 'white' : Colors.neutral[400]}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: canConfirm ? 'white' : Colors.neutral[400],
                    }}
                  >
                    Confirmar abordaje
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
