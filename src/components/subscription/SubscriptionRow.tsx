import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, ChevronRight, Clock, MapPin, Users } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { SubscriptionStatusBadge } from '@/components/routine/SubscriptionStatusBadge';
import { Colors } from '@/constants/colors';
import type { RecurrenceDay, RoutineSubscriptionResponse } from '@/types/api';

// ── Helpers ──

export const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue', FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

export function formatSubscriptionDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short',
    });
  } catch { return iso; }
}

// ── Component ──

export function SubscriptionRow({
  subscription,
  onPress,
}: {
  subscription: RoutineSubscriptionResponse;
  onPress: () => void;
}) {
  const trip = subscription.routineTrip;
  const totalPrice = trip ? trip.pricePerSeat * subscription.seatsRequired : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            {/* Origin */}
            <View className="flex-row items-start gap-1.5 mb-0.5">
              <View className="w-2 h-2 rounded-full bg-primary-500 mt-1" />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                  {trip?.originName ?? '—'}
                </Text>
                {trip?.originSubtitle ? (
                  <Text className="text-[11px] text-neutral-400" numberOfLines={1}>{trip.originSubtitle}</Text>
                ) : null}
              </View>
            </View>

            {/* Destination */}
            <View className="flex-row items-start gap-1.5 mb-2">
              <MapPin size={12} color={Colors.neutral[400]} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-sm text-neutral-600" numberOfLines={1}>
                  {trip?.destinationName ?? '—'}
                </Text>
                {trip?.destinationSubtitle ? (
                  <Text className="text-[11px] text-neutral-400" numberOfLines={1}>{trip.destinationSubtitle}</Text>
                ) : null}
              </View>
            </View>

            {/* Schedule */}
            {trip && (
              <View className="flex-row items-center gap-1.5 mb-2">
                <Clock size={12} color={Colors.neutral[500]} />
                <Text className="text-xs text-neutral-500">
                  {trip.departureTime} → {trip.requiredArrivalTime}
                </Text>
              </View>
            )}

            {/* Days */}
            <View className="flex-row flex-wrap gap-1 mb-2">
              {subscription.subscribedDays.map((d) => (
                <View key={d} className="bg-primary-50 px-1.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-medium text-primary-700">{DAY_LABELS[d]}</Text>
                </View>
              ))}
            </View>

            {/* Seats + price */}
            <View className="flex-row items-center gap-3 mb-2">
              <View className="flex-row items-center gap-1">
                <Users size={12} color={Colors.neutral[500]} />
                <Text className="text-xs text-neutral-500">
                  {subscription.seatsRequired} {subscription.seatsRequired === 1 ? 'asiento' : 'asientos'}
                </Text>
              </View>
              {totalPrice !== null && (
                <Text className="text-xs font-semibold text-neutral-700">
                  {trip!.currency} {totalPrice.toLocaleString('es-CO')} / viaje
                </Text>
              )}
            </View>

            {/* Period */}
            <View className="flex-row items-center gap-1.5">
              <Calendar size={12} color={Colors.neutral[400]} />
              <Text className="text-xs text-neutral-400">
                Desde {formatSubscriptionDate(subscription.startDate)}
                {subscription.endDate ? ` · Hasta ${formatSubscriptionDate(subscription.endDate)}` : ''}
              </Text>
            </View>
          </View>

          <View className="items-end gap-2">
            <SubscriptionStatusBadge status={subscription.status} />
            <ChevronRight size={16} color={Colors.neutral[400]} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
