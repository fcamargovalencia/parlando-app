import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ticket, Check, X, UserX } from 'lucide-react-native';
import { Badge } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { BOOKING_STATUS_BADGE } from '@/constants/trips';
import { formatCurrency } from '@/lib/utils';
import type { BookingResponse, TripResponse } from '@/types/api';

interface ChatBookingBarProps {
  isDriver: boolean;
  trip: TripResponse;
  myBooking: BookingResponse | null;
  counterpartBooking: BookingResponse | null;
  actionLoading: boolean;
  onReserve: () => void;
  onAccept: (bookingId: string) => void;
  onReject: (bookingId: string) => void;
}

export function ChatBookingBar({
  isDriver,
  trip,
  myBooking,
  counterpartBooking,
  actionLoading,
  onReserve,
  onAccept,
  onReject,
}: ChatBookingBarProps) {
  // ── Vista conductor ──
  if (isDriver) {
    if (!counterpartBooking) {
      return (
        <View className="flex-row items-center gap-2 px-4 py-2.5 border-b border-neutral-200 bg-neutral-100">
          <UserX size={15} color={Colors.neutral[400]} />
          <Text className="text-sm text-neutral-400 flex-1">Sin reserva del pasajero</Text>
        </View>
      );
    }

    const badge = BOOKING_STATUS_BADGE[counterpartBooking.status];

    return (
      <View
        className="px-4 py-2.5 border-b border-primary-100"
        style={{ backgroundColor: Colors.primary[50] }}
      >
        <View className="flex-row items-center gap-2">
          <Badge label={badge.label} variant={badge.variant} />
          <Text className="text-sm text-neutral-600 flex-1">
            {counterpartBooking.seatsBooked}{' '}
            {counterpartBooking.seatsBooked === 1 ? 'asiento' : 'asientos'}
          </Text>
          {counterpartBooking.status === 'PENDING' && (
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onAccept(counterpartBooking.id)}
                disabled={actionLoading}
                className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg"
                style={{ backgroundColor: Colors.primary[600] }}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={13} color="#fff" strokeWidth={2.5} />
                    <Text className="text-xs font-semibold text-white">Aceptar</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onReject(counterpartBooking.id)}
                disabled={actionLoading}
                className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50"
                style={{ borderWidth: 1, borderColor: '#FCA5A5' }}
              >
                <X size={13} color="#EF4444" strokeWidth={2.5} />
                <Text className="text-xs font-semibold text-red-500">Rechazar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Vista pasajero — sin reserva ──
  if (!myBooking) {
    if (trip.availableSeats <= 0) {
      return (
        <View className="flex-row items-center gap-2 px-4 py-2.5 border-b border-neutral-200 bg-neutral-100">
          <UserX size={15} color={Colors.neutral[400]} />
          <Text className="text-sm text-neutral-400 flex-1">Sin cupos disponibles</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          onReserve();
        }}
        activeOpacity={0.8}
        className="flex-row items-center gap-2 px-4 py-2.5 border-b border-primary-100"
        style={{ backgroundColor: Colors.primary[50] }}
      >
        <Ticket size={16} color={Colors.semantic.info} />
        <Text className="text-sm font-semibold flex-1" style={{ color: Colors.semantic.info }}>
          Reservar cupo · {formatCurrency(trip.pricePerSeat, trip.currency)} / asiento
        </Text>
      </TouchableOpacity>
    );
  }

  // ── Vista pasajero — con reserva ──
  const badge = BOOKING_STATUS_BADGE[myBooking.status];

  return (
    <View
      className="flex-row items-center gap-2 px-4 py-2.5 border-b border-primary-100"
      style={{ backgroundColor: Colors.primary[50] }}
    >
      <Badge label={badge.label} variant={badge.variant} />
      <Text className="text-sm text-neutral-600 flex-1">
        {myBooking.seatsBooked}{' '}
        {myBooking.seatsBooked === 1 ? 'asiento solicitado' : 'asientos solicitados'}
      </Text>
    </View>
  );
}
