import React from 'react';
import { View, Text } from 'react-native';
import { UserCheck } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { BookingRow } from './BookingRow';
import type { BookingResponse, TripStatus } from '@/types/api';

interface PassengerBookingsListProps {
  bookings: BookingResponse[];
  tripId: string;
  tripStatus: TripStatus;
  actionLoading: string | null;
  ratedUserIds: Set<string>;
  passengerCommentCounts: Record<string, number>;
  onBookingAction: (bookingId: string, action: 'accept' | 'reject' | 'board' | 'noshow') => void;
  onRate: (booking: BookingResponse) => void;
  onMessage: (booking: BookingResponse) => void;
}

export const PassengerBookingsList = React.memo(function PassengerBookingsList({
  bookings,
  tripId,
  tripStatus,
  actionLoading,
  ratedUserIds,
  passengerCommentCounts,
  onBookingAction,
  onRate,
  onMessage,
}: PassengerBookingsListProps) {
  return (
    <Card>
      <View className="flex-row items-center gap-2 mb-3">
        <UserCheck size={18} color={Colors.primary[600]} />
        <Text className="text-base font-semibold text-neutral-700">
          Solicitudes de pasajeros
        </Text>
        {bookings.length > 0 && (
          <View className="ml-auto bg-primary-100 rounded-full px-2 py-0.5">
            <Text className="text-xs font-bold text-primary-700">{bookings.length}</Text>
          </View>
        )}
      </View>

      {bookings.length === 0 ? (
        <View className="items-center py-6">
          <View className="w-14 h-14 rounded-full bg-neutral-100 items-center justify-center mb-3">
            <UserCheck size={28} color={Colors.neutral[300]} />
          </View>
          <Text className="text-sm font-medium text-neutral-600 mb-1">
            Sin solicitudes aún
          </Text>
          <Text className="text-xs text-neutral-400 text-center px-4">
            Cuando un pasajero solicite un cupo, aparecerá aquí.
          </Text>
        </View>
      ) : (
        bookings.map((b) => (
          <BookingRow
            key={b.id}
            booking={b}
            tripId={tripId}
            tripStatus={tripStatus}
            actionLoading={actionLoading}
            isRated={b.passenger ? ratedUserIds.has(b.passenger.id) : false}
            commentCount={b.passenger ? passengerCommentCounts[b.passenger.id] : undefined}
            onBookingAction={onBookingAction}
            onRate={onRate}
            onMessage={onMessage}
          />
        ))
      )}
    </Card>
  );
});
