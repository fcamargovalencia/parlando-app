import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Shadows } from '@/constants/colors';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui';
import { bookingsApi } from '@/api/bookings';
import { formatCurrency } from '@/lib/utils';
import type { TripResponse, BookingResponse } from '@/types/api';
import Toast from 'react-native-toast-message';

interface BookTripModalProps {
  trip: TripResponse;
  visible: boolean;
  onClose: () => void;
  onBooked: (booking: BookingResponse) => void;
}

export function BookTripModal({
  trip,
  visible,
  onClose,
  onBooked,
}: BookTripModalProps) {
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const maxSeats = Math.min(trip.availableSeats, 4);

  const handleBook = async () => {
    setLoading(true);
    try {
      const { data: res } = await bookingsApi.create({
        tripId: trip.id,
        seatsBooked: seats,
      });
      if (!res.data) throw new Error();
      onBooked(res.data);
      Toast.show({
        type: 'success',
        text1: '¡Solicitud enviada!',
        text2: 'El conductor revisará tu solicitud.',
      });
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message ?? 'No se pudo crear la reserva',
      );
    } finally {
      setLoading(false);
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
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        className="bg-white rounded-t-3xl px-5 pt-4"
        style={{
          paddingBottom: Platform.OS === 'ios' ? 36 : 24,
          ...Shadows.lg,
        }}
      >
        {/* Handle */}
        <View className="w-10 h-1 rounded-full bg-neutral-200 self-center mb-5" />

        <Text className="text-lg font-bold text-neutral-900 mb-1">
          Reservar cupo
        </Text>
        <Text className="text-sm text-neutral-500 mb-5">
          {trip.originName} → {trip.destinationName}
        </Text>

        {/* Seats selector */}
        <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
          Número de asientos
        </Text>
        <View className="flex-row gap-2 mb-5">
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

        {/* Price summary */}
        <View className="bg-primary-50 rounded-2xl p-4 mb-5 flex-row items-center justify-between">
          <Text className="text-sm text-neutral-600">
            {seats} {seats === 1 ? 'asiento' : 'asientos'} ×{' '}
            {formatCurrency(trip.pricePerSeat, trip.currency)}
          </Text>
          <Text className="text-base font-bold text-primary-700">
            {formatCurrency(trip.pricePerSeat * seats, trip.currency)}
          </Text>
        </View>

        <Button
          onPress={handleBook}
          loading={loading}
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
