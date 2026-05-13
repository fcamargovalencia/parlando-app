import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ticket, Armchair, Banknote, KeyRound } from 'lucide-react-native';
import { Card, Badge } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { formatCurrency } from '@/lib/utils';
import type { BookingResponse, BookingStatus, TripStatus } from '@/types/api';

// ── Badge config ──

const BOOKING_DETAIL_BADGE: Record<
  BookingStatus,
  { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'neutral'; }
> = {
  PENDING: { label: 'Pendiente de aprobación', variant: 'warning' },
  ACCEPTED: { label: 'Cupo aceptado', variant: 'success' },
  REJECTED: { label: 'Solicitud rechazada', variant: 'error' },
  BOARDED: { label: 'Abordo', variant: 'info' },
  COMPLETED: { label: 'Completado', variant: 'success' },
  CANCELLED: { label: 'Cancelado', variant: 'neutral' },
  NO_SHOW: { label: 'No asististe', variant: 'error' },
};

// ── Component ──

interface MyBookingCardProps {
  booking: BookingResponse;
  pricePerSeat: number;
  currency: string;
  tripStatus: TripStatus;
  actionLoading: string | null;
  onCancelBooking: () => void;
}

export const MyBookingCard = React.memo(function MyBookingCard({
  booking,
  pricePerSeat,
  currency,
  tripStatus,
  actionLoading,
  onCancelBooking,
}: MyBookingCardProps) {
  const canCancel = booking.status === 'PENDING' || booking.status === 'ACCEPTED';

  return (
    <Card>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Ticket size={16} color={Colors.primary[600]} />
          <Text className="text-base font-semibold text-neutral-700">Mi reserva</Text>
        </View>
        {booking.status !== 'COMPLETED' && tripStatus !== 'COMPLETED' && (
          <Badge
            label={BOOKING_DETAIL_BADGE[booking.status].label}
            variant={BOOKING_DETAIL_BADGE[booking.status].variant}
          />
        )}
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Armchair size={15} color={Colors.neutral[400]} />
          <Text className="text-base text-neutral-600">
            {booking.seatsBooked} {booking.seatsBooked === 1 ? 'asiento' : 'asientos'}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Banknote size={15} color={Colors.neutral[400]} />
          <Text className="text-base font-bold text-primary-700">
            {formatCurrency(pricePerSeat * booking.seatsBooked, currency)}
          </Text>
        </View>
      </View>

      {canCancel && (
        <TouchableOpacity
          onPress={onCancelBooking}
          disabled={actionLoading === 'cancel-booking'}
          className="mt-4 pt-3 border-t border-neutral-100"
        >
          <Text
            className={`text-sm font-medium text-center ${actionLoading === 'cancel-booking' ? 'text-neutral-400' : 'text-red-500'
              }`}
          >
            {actionLoading === 'cancel-booking' ? 'Cancelando...' : 'Cancelar reserva'}
          </Text>
        </TouchableOpacity>
      )}

      {booking.status === 'PENDING' && (
        <View className="mt-3 bg-amber-50 rounded-xl p-3">
          <Text className="text-sm text-amber-700 text-center leading-5">
            Tu solicitud está pendiente. El conductor la revisará pronto.
          </Text>
        </View>
      )}

      {booking.status === 'ACCEPTED' && tripStatus === 'IN_PROGRESS' && booking.verificationCode && (
        <View
          className="mt-4 rounded-2xl p-4"
          style={{ backgroundColor: Colors.primary[600] }}
        >
          <View className="flex-row items-center justify-center gap-2 mb-2">
            <KeyRound size={15} color="rgba(255,255,255,0.8)" />
            <Text className="text-xs font-semibold text-center" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Código de abordaje
            </Text>
          </View>
          <Text
            className="text-center font-bold"
            style={{
              fontSize: 32,
              letterSpacing: 10,
              color: 'white',
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            }}
          >
            {booking.verificationCode}
          </Text>
          <Text className="text-xs text-center mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Muéstraselo al conductor al abordar
          </Text>
        </View>
      )}
    </Card>
  );
});
