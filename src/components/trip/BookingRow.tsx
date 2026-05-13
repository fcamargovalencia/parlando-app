import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Star,
  MessageSquare,
  Armchair,
  Check,
  X,
  UserCheck,
  UserX,
  Send,
} from 'lucide-react-native';
import { Badge, Avatar } from '@/components/ui';
import { BoardPassengerModal } from './BoardPassengerModal';
import { Colors } from '@/constants/colors';
import { BOOKING_STATUS_BADGE } from '@/constants/trips';
import type { BookingResponse, TripStatus, PaymentMethod } from '@/types/api';

interface BookingRowProps {
  booking: BookingResponse;
  tripId: string;
  tripStatus: TripStatus;
  pricePerSeat: number;
  currency: string;
  actionLoading: string | null;
  isRated: boolean;
  commentCount?: number;
  onBookingAction: (bookingId: string, action: 'accept' | 'reject' | 'noshow') => void;
  onBoard: (bookingId: string, verificationCode: string, paymentMethod: PaymentMethod) => Promise<void>;
  onRate: (booking: BookingResponse) => void;
  onMessage: (booking: BookingResponse) => void;
}

export const BookingRow = React.memo(function BookingRow({
  booking,
  tripId,
  tripStatus,
  pricePerSeat,
  currency,
  actionLoading,
  isRated,
  commentCount,
  onBookingAction,
  onBoard,
  onRate,
  onMessage,
}: BookingRowProps) {
  const router = useRouter();
  const passenger = booking.passenger;
  const badgeCfg = BOOKING_STATUS_BADGE[booking.status];
  const isLoading = (label: string) => actionLoading === `${booking.id}-${label}`;
  const [boardModalVisible, setBoardModalVisible] = useState(false);

  return (
    <View className="py-3 border-b border-neutral-100">
      {/* Passenger info */}
      <TouchableOpacity
        className="flex-row items-center gap-3 mb-2"
        activeOpacity={0.7}
        onPress={() =>
          passenger &&
          router.push({ pathname: '/user/[id]', params: { id: passenger.id, tripId } })
        }
      >
        <Avatar
          uri={passenger?.profilePhotoUrl ?? null}
          firstName={passenger?.firstName ?? '?'}
          lastName={passenger?.lastName ?? ''}
          size="md"
        />
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center mb-0.5">
            <Text className="text-base font-semibold text-neutral-900 flex-1 mr-2" numberOfLines={1}>
              {passenger ? `${passenger.firstName} ${passenger.lastName}` : 'Pasajero'}
            </Text>
            {booking.status !== 'COMPLETED' && (
              <Badge label={badgeCfg.label} variant={badgeCfg.variant} />
            )}
          </View>
          <View className="flex-row items-center gap-2 flex-wrap">
            {passenger && (
              <View className="flex-row items-center gap-1">
                <Star size={12} color={Colors.semantic.warning} fill={Colors.semantic.warning} />
                <Text className="text-xs font-medium text-neutral-600">
                  {passenger.trustScore} / 5
                </Text>
              </View>
            )}
            {commentCount !== undefined && (
              <View className="flex-row items-center gap-1">
                <MessageSquare size={12} color={Colors.neutral[400]} />
                <Text className="text-xs font-medium text-neutral-600">
                  {commentCount} comentarios
                </Text>
              </View>
            )}
            <View className="flex-row items-center gap-1">
              <Armchair size={12} color={Colors.neutral[400]} />
              <Text className="text-xs font-medium text-neutral-600">
                {booking.seatsBooked} {booking.seatsBooked === 1 ? 'asiento' : 'asientos'}
              </Text>
            </View>
          </View>
        </View>
        <ChevronRight size={20} color={Colors.neutral[600]} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Completed: rating */}
      {booking.status === 'COMPLETED' && (
        <View className="mt-2 pt-2 border-t border-neutral-100 items-end">
          {isRated || booking.passengerRatingId ? (
            <View
              className="flex-row items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full"
              style={{ borderWidth: 1, borderColor: '#BBF7D0' }}
            >
              <Star size={13} color="#16A34A" fill="#16A34A" />
              <Text className="text-sm font-semibold text-green-700">Calificado</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => onRate(booking)}
              className="flex-row items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full"
              style={{ borderWidth: 1, borderColor: '#FDE68A' }}
            >
              <Star size={13} color={Colors.semantic.warning} fill={Colors.semantic.warning} />
              <Text className="text-sm font-semibold text-amber-600">
                Calificar pasajero
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Pending: accept / reject */}
      {booking.status === 'PENDING' && (
        <View className="flex-row gap-2 ml-12">
          <TouchableOpacity
            onPress={() => onBookingAction(booking.id, 'accept')}
            disabled={!!actionLoading}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl"
            style={{ backgroundColor: Colors.primary[600] }}
          >
            {isLoading('accept') ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Check size={14} color="#fff" />
                <Text className="text-white text-sm font-semibold">Aceptar</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onBookingAction(booking.id, 'reject')}
            disabled={!!actionLoading}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50"
            style={{ borderWidth: 1, borderColor: '#FCA5A5' }}
          >
            {isLoading('reject') ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <X size={14} color="#EF4444" />
                <Text className="text-red-500 text-sm font-semibold">Rechazar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* In progress: board / no-show */}
      {booking.status === 'ACCEPTED' && tripStatus === 'IN_PROGRESS' && (
        <View className="flex-row gap-2 ml-12">
          <TouchableOpacity
            onPress={() => setBoardModalVisible(true)}
            disabled={!!actionLoading}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl"
            style={{ backgroundColor: Colors.primary[600] }}
          >
            {isLoading('board') ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <UserCheck size={14} color="#fff" />
                <Text className="text-white text-sm font-semibold">
                  Registrar abordaje
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onBookingAction(booking.id, 'noshow')}
            disabled={!!actionLoading}
            className="flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100"
          >
            {isLoading('noshow') ? (
              <ActivityIndicator size="small" color={Colors.neutral[500]} />
            ) : (
              <UserX size={14} color={Colors.neutral[500]} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Message button */}
      {booking.passenger &&
        (booking.status === 'PENDING' ||
          booking.status === 'ACCEPTED' ||
          booking.status === 'BOARDED') && (
          <TouchableOpacity
            onPress={() => onMessage(booking)}
            className="flex-row items-center justify-center gap-1.5 ml-12 mt-2 py-2 rounded-xl"
            style={{
              backgroundColor: Colors.primary[50],
              borderWidth: 1,
              borderColor: Colors.primary[200],
            }}
          >
            <Send size={13} color={Colors.primary[600]} />
            <Text className="text-sm font-semibold" style={{ color: Colors.primary[600] }}>
              Enviar mensaje
            </Text>
          </TouchableOpacity>
        )}

      <BoardPassengerModal
        visible={boardModalVisible}
        booking={booking}
        pricePerSeat={pricePerSeat}
        currency={currency}
        onConfirm={async (code, method) => {
          await onBoard(booking.id, code, method);
          setBoardModalVisible(false);
        }}
        onDismiss={() => setBoardModalVisible(false)}
      />
    </View>
  );
});
