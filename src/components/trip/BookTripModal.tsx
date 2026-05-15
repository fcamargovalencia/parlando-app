import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shadows } from '@/constants/colors';
import { Colors } from '@/constants/colors';
import { Button, ModalDragHandle } from '@/components/ui';
import { bookingsApi } from '@/api/bookings';
import { formatCurrency } from '@/lib/utils';
import type { TripResponse, BookingResponse } from '@/types/api';
import Toast from 'react-native-toast-message';

interface BookTripModalProps {
  trip: TripResponse;
  visible: boolean;
  onClose: () => void;
  onConfirm: (booking: BookingResponse) => void;
}

export function BookTripModal({
  trip,
  visible,
  onClose,
  onConfirm,
}: BookTripModalProps) {
  const insets = useSafeAreaInsets();
  const [seats, setSeats] = useState(1);
  const maxSeats = Math.max(0, trip.availableSeats);
  const isIntercity = trip.tripType === 'INTERCITY';
  const canSubmit = maxSeats > 0 && seats > 0 && seats <= maxSeats;

  useEffect(() => {
    if (!visible) return;
    if (maxSeats <= 0) {
      setSeats(0);
      return;
    }
    setSeats((prev) => {
      if (prev <= 0) return 1;
      return Math.min(prev, maxSeats);
    });
  }, [visible, maxSeats]);

  const [isPending, setIsPending] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const submitBooking = async () => {
    if (isPending) return;
    setIsPending(true);
    setBookingError(null);
    try {
      const { data: res } = await bookingsApi.create({
        tripId: trip.id,
        seatsBooked: seats,
      });
      if (!res.data) throw new Error();
      onConfirm(res.data);
      Toast.show({
        type: 'success',
        text1: '¡Solicitud enviada!',
        text2: 'El conductor revisará tu solicitud.',
      });
      onClose();
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string; }; }; })?.response?.data?.message;
      setBookingError(apiMessage ?? 'No se pudo crear la reserva');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: Colors.overlay }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        className="bg-white rounded-t-3xl px-5 pt-4"
        style={{
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 16) + 16,
          ...Shadows.lg,
        }}
      >
        <ModalDragHandle />

        <Text className="text-lg font-bold text-neutral-900 mb-1">
          Reservar cupo
        </Text>
        <View className="mb-5 gap-2.5">
          <View className="flex-row items-start">
            <View
              className="w-2 h-2 rounded-full mr-2 mt-1.5"
              style={{ backgroundColor: Colors.semantic.success }}
            />
            <View className="flex-1">
              <Text className="text-sm text-neutral-600">{trip.originName}</Text>
              {isIntercity && !!trip.originSubtitle && (
                <Text className="text-xs text-neutral-400 mt-0.5">{trip.originSubtitle}</Text>
              )}
            </View>
          </View>
          <View className="flex-row items-start">
            <View
              className="w-2 h-2 rounded-full mr-2 mt-1.5"
              style={{ backgroundColor: Colors.accent[500] }}
            />
            <View className="flex-1">
              <Text className="text-sm text-neutral-600">{trip.destinationName}</Text>
              {isIntercity && !!trip.destinationSubtitle && (
                <Text className="text-xs text-neutral-400 mt-0.5">{trip.destinationSubtitle}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Seats selector */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Número de asientos
          </Text>
          <Text className="text-xs font-semibold text-neutral-600">
            Disponibles: {trip.availableSeats}
          </Text>
        </View>
        {maxSeats > 0 ? (
          <View className="flex-row items-start gap-3 mb-5">
            <View className="flex-1 flex-row flex-wrap gap-2">
              {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setSeats(n)}
                  activeOpacity={0.75}
                  className="w-12 h-12 rounded-2xl items-center justify-center"
                  style={{
                    backgroundColor:
                      seats === n ? Colors.primary[600] : Colors.neutral[100],
                    borderWidth: seats === n ? 0 : 1,
                    borderColor: Colors.neutral[200],
                  }}
                >
                  <Text
                    className="text-base font-bold"
                    style={{
                      color: seats === n ? '#fff' : Colors.neutral[700],
                    }}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="bg-primary-50 rounded-xl px-3 py-2.5 min-w-[118px] items-end">
              <Text className="text-xs text-neutral-500">
                {seats} {seats === 1 ? 'asiento' : 'asientos'}
              </Text>
              <Text className="text-base font-bold text-primary-700 mt-0.5">
                {formatCurrency(trip.pricePerSeat * seats, trip.currency)}
              </Text>
            </View>
          </View>
        ) : (
          <View className="mb-5 px-3 py-2.5 rounded-xl bg-neutral-100">
            <Text className="text-xs text-neutral-500">No hay cupos disponibles para reservar.</Text>
          </View>
        )}

        {bookingError && (
          <Text className="text-red-500 text-xs text-center mb-3">{bookingError}</Text>
        )}
        <Button
          onPress={submitBooking}
          loading={isPending}
          disabled={!canSubmit}
          size="lg"
          className="w-full"
        >
          Enviar solicitud
        </Button>
        <TouchableOpacity
          onPress={onClose}
          className="mt-3 py-2 items-center"
        >
          <Text className="text-sm text-neutral-400">Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
