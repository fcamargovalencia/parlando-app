import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Map,
  MapPin,
  Navigation,
  Star,
  Users,
} from 'lucide-react-native';
import { Avatar, Badge, Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { metersLabel } from '@/utils/routine-trip.utils';
import type { RecurrenceDay, RoutineSubscriptionResponse } from '@/types/api';

const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: 'Lun',
  TUE: 'Mar',
  WED: 'Mié',
  THU: 'Jue',
  FRI: 'Vie',
  SAT: 'Sáb',
  SUN: 'Dom',
};

function secondsToMinutes(s: number): number {
  return Math.round(s / 60);
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export interface SubscriptionRequestCardProps {
  subscription: RoutineSubscriptionResponse;
  /** Show accept/reject actions (only for PENDING tab) */
  showActions?: boolean;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onViewMap?: (id: string) => void;
}

export const SubscriptionRequestCard = React.memo(function SubscriptionRequestCard({
  subscription,
  showActions = false,
  onAccept,
  onReject,
  onViewMap,
}: SubscriptionRequestCardProps) {
  const { passenger, subscribedDays, startDate, endDate, seatsRequired,
    specialRequirements, pickupType, pickupWaypointId, customPickupName,
    routeDeviationMeters, timeOverheadSeconds, consecutiveNoShows } = subscription;

  const passengerName = passenger?.name ?? 'Pasajero';
  const nameParts = passengerName.split(' ');

  return (
    <Card className="mb-3 p-4">
      {/* Passenger info */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2.5">
          <Avatar
            firstName={nameParts[0]}
            lastName={nameParts[1] ?? ''}
            size="sm"
            verified={passenger?.verified}
          />
          <View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-sm font-semibold text-neutral-900">{passengerName}</Text>
              {passenger?.verified && (
                <CheckCircle2 size={14} color={Colors.primary[500]} />
              )}
            </View>
            {passenger?.rating != null && (
              <View className="flex-row items-center gap-1 mt-0.5">
                <Star size={11} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-xs text-neutral-500">{passenger.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* No-shows warning */}
        {consecutiveNoShows > 0 && (
          <View className="flex-row items-center gap-1 bg-red-50 px-2.5 py-1 rounded-full">
            <AlertTriangle size={12} color={Colors.semantic.error} />
            <Text className="text-xs text-red-700 font-medium">
              {consecutiveNoShows} {consecutiveNoShows === 1 ? 'inasistencia' : 'inasistencias'}
            </Text>
          </View>
        )}
      </View>

      {/* Pickup point */}
      <View className="mb-3">
        <View className="flex-row items-start gap-2">
          {pickupType === 'SUGGESTED' ? (
            <Navigation size={14} color={Colors.accent[500]} style={{ marginTop: 2 }} />
          ) : (
            <MapPin size={14} color={Colors.primary[500]} style={{ marginTop: 2 }} />
          )}
          <View className="flex-1">
            {pickupType === 'WAYPOINT' && (
              <Text className="text-sm text-neutral-700">
                Parada:{' '}
                <Text className="font-medium text-neutral-900">
                  {customPickupName ?? (pickupWaypointId ? 'Waypoint seleccionado' : '—')}
                </Text>
              </Text>
            )}
            {pickupType === 'SUGGESTED' && (
              <>
                <Text className="text-sm text-neutral-700">
                  Punto sugerido:{' '}
                  <Text className="font-medium text-neutral-900">
                    {customPickupName ?? 'Punto personalizado'}
                  </Text>
                </Text>
                {routeDeviationMeters != null && timeOverheadSeconds != null && (
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    Desviación: {metersLabel(routeDeviationMeters)} · ~{secondsToMinutes(timeOverheadSeconds)} min extra
                  </Text>
                )}
              </>
            )}
            {pickupType === 'ACCEPTED_CUSTOM' && (
              <Text className="text-sm text-neutral-700">
                Punto aceptado:{' '}
                <Text className="font-medium text-neutral-900">
                  {customPickupName ?? 'Punto personalizado'}
                </Text>
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Subscribed days */}
      <View className="flex-row flex-wrap gap-1.5 mb-3">
        {(subscribedDays as RecurrenceDay[]).map((day) => (
          <View
            key={day}
            className="px-2.5 py-0.5 rounded-full bg-primary-50 border border-primary-200"
          >
            <Text className="text-xs font-semibold text-primary-700">{DAY_LABELS[day]}</Text>
          </View>
        ))}
      </View>

      {/* Period & seats */}
      <View className="flex-row items-center gap-4 mb-3">
        <View className="flex-row items-center gap-1.5">
          <Calendar size={13} color={Colors.neutral[400]} />
          <Text className="text-xs text-neutral-600">
            {`Desde ${formatDate(startDate)}`}
            {endDate ? ` · Hasta ${formatDate(endDate)}` : ' · Sin fecha de fin'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-1.5 mb-3">
        <Users size={13} color={Colors.neutral[400]} />
        <Text className="text-xs text-neutral-600">
          {seatsRequired} {seatsRequired === 1 ? 'cupo' : 'cupos'}
        </Text>
      </View>

      {/* Special requirements */}
      {specialRequirements ? (
        <View className="flex-row items-start gap-2 bg-yellow-50 rounded-xl px-3 py-2.5 mb-3">
          <AlertTriangle size={14} color={Colors.semantic.warning} style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="text-xs font-semibold text-yellow-800 mb-0.5">
              Necesidades especiales
            </Text>
            <Text className="text-xs text-yellow-700">{specialRequirements}</Text>
          </View>
        </View>
      ) : null}

      {/* Accept / Reject actions */}
      <View className="flex-row gap-3 mt-1">
        {showActions && (
          <TouchableOpacity
            onPress={() => onReject?.(subscription.id)}
            className="flex-1 py-2.5 rounded-xl border border-red-300 items-center"
            activeOpacity={0.7}
          >
            <Text className="text-sm font-semibold text-red-600">Rechazar</Text>
          </TouchableOpacity>)}
        <TouchableOpacity
          onPress={() => onViewMap?.(subscription.id)}
          className="flex-1 py-2.5 rounded-xl border border-primary-500 flex-row items-center justify-center gap-1.5"
          activeOpacity={0.7}
        >
          <Map size={14} color={Colors.primary[500]} />
          <Text className="text-sm font-semibold text-primary-600">Ver ruta</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
});
