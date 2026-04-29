import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, AlertCircle, Navigation } from 'lucide-react-native';
import { Avatar, Badge, Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { RoutineBookingResponse, RoutineSubscriptionResponse } from '@/types/api';

export interface OccurrencePassengerCardProps {
  booking: RoutineBookingResponse;
  subscription: RoutineSubscriptionResponse;
  stopIndex: number;                // 1-based order label in route
  pickupLat: number;
  pickupLng: number;
  pickupName?: string;
  occurrenceIsFuture: boolean;
  onMarkNoShow: (bookingId: string) => void;
  onOverridePickup: (bookingId: string) => void;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' | 'info'; }> = {
  ACCEPTED: { label: 'Confirmado', variant: 'success' },
  PENDING: { label: 'Pendiente', variant: 'warning' },
  REJECTED: { label: 'Rechazado', variant: 'error' },
  BOARDED: { label: 'Abordado', variant: 'info' },
  NO_SHOW: { label: 'No se presentó', variant: 'error' },
  CANCELLED: { label: 'Cancelado', variant: 'neutral' },
};

export function OccurrencePassengerCard({
  booking,
  subscription,
  stopIndex,
  pickupLat,
  pickupLng,
  pickupName,
  occurrenceIsFuture,
  onMarkNoShow,
  onOverridePickup,
}: OccurrencePassengerCardProps) {
  const passengerName = booking.passenger?.name ?? subscription.passenger?.name ?? 'Pasajero';
  const nameParts = passengerName.split(' ');
  const statusConfig = STATUS_BADGE[booking.status] ?? { label: booking.status, variant: 'neutral' as const };

  const canAct = occurrenceIsFuture && booking.status === 'ACCEPTED';

  const resolvedPickupName = pickupName
    ?? subscription.customPickupName
    ?? 'Punto de recogida';

  return (
    <Card className="mb-3 p-4">
      {/* Header: stop order + passenger + status */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2.5">
          {/* Stop order badge */}
          <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
            <Text className="text-[10px] font-bold text-white">{stopIndex}</Text>
          </View>
          <Avatar
            firstName={nameParts[0]}
            lastName={nameParts[1] ?? ''}
            size="sm"
            verified={booking.passenger?.verified ?? subscription.passenger?.verified}
          />
          <View>
            <Text className="text-sm font-semibold text-neutral-900">{passengerName}</Text>
            {booking.passenger?.rating != null && (
              <Text className="text-xs text-neutral-500">★ {booking.passenger.rating.toFixed(1)}</Text>
            )}
          </View>
        </View>
        <Badge label={statusConfig.label} variant={statusConfig.variant} />
      </View>

      {/* Pickup location */}
      <View className="flex-row items-start gap-2 mb-1">
        <MapPin size={14} color={Colors.accent[500]} style={{ marginTop: 1 }} />
        <Text className="text-xs text-neutral-600 flex-1" numberOfLines={2}>
          {resolvedPickupName}
        </Text>
      </View>

      {/* Pickup type info */}
      {subscription.pickupType === 'SUGGESTED' || subscription.pickupType === 'ACCEPTED_CUSTOM' ? (
        <View className="flex-row items-center gap-1.5 mb-1 ml-5">
          <Navigation size={11} color={Colors.primary[400]} />
          <Text className="text-[11px] text-primary-600">Punto personalizado</Text>
          {subscription.routeDeviationMeters != null && (
            <Text className="text-[11px] text-neutral-400">
              · {subscription.routeDeviationMeters < 1000
                ? `${Math.round(subscription.routeDeviationMeters)} m`
                : `${(subscription.routeDeviationMeters / 1000).toFixed(1)} km`} de la ruta
            </Text>
          )}
        </View>
      ) : null}

      {/* Actions */}
      {canAct && (
        <View className="flex-row gap-2 mt-3">
          <TouchableOpacity
            onPress={() => onMarkNoShow(booking.id)}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 bg-red-50"
            activeOpacity={0.7}
          >
            <AlertCircle size={14} color={Colors.semantic.error} />
            <Text className="text-xs font-medium text-red-600">No se presentó</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onOverridePickup(booking.id)}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg border border-primary-200 bg-primary-50"
            activeOpacity={0.7}
          >
            <MapPin size={14} color={Colors.primary[600]} />
            <Text className="text-xs font-medium text-primary-700">Cambiar punto</Text>
          </TouchableOpacity>
        </View>
      )}

      {booking.status === 'NO_SHOW' && (
        <View className="flex-row items-center gap-1.5 mt-2">
          <AlertCircle size={13} color={Colors.semantic.error} />
          <Text className="text-xs text-red-500">Marcado como no presentado</Text>
        </View>
      )}
    </Card>
  );
}
