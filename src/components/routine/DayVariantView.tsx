import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Users, Map } from 'lucide-react-native';
import { OccurrenceMapView } from '@/components/routine/OccurrenceMapView';
import { Colors } from '@/constants/colors';
import { useDayVariant } from '@/hooks/useDayVariant';
import type { RecurrenceDay, RoutineSubscriptionResponse } from '@/types/api';

// ── Day label ──

const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue',
  FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

const DAY_FULL: Record<RecurrenceDay, string> = {
  MON: 'Lunes', TUE: 'Martes', WED: 'Miércoles', THU: 'Jueves',
  FRI: 'Viernes', SAT: 'Sábado', SUN: 'Domingo',
};

// ── Subscriber row ──

function SubscriberRow({ sub }: { sub: RoutineSubscriptionResponse; }) {
  const name = sub.passenger
    ? `${sub.passenger.firstName} ${sub.passenger.lastName}`.trim()
    : 'Pasajero';
  const pickupLabel = sub.customPickupName
    ?? (sub.pickupType === 'ORIGIN' ? 'Origen del viaje' : 'Waypoint');

  return (
    <View className="flex-row items-center gap-2.5 py-2.5 border-b border-neutral-100">
      <View className="w-2 h-2 rounded-full bg-accent-500" />
      <View className="flex-1">
        <Text className="text-xs font-semibold text-neutral-900">{name}</Text>
        <Text className="text-[11px] text-neutral-500 mt-px" numberOfLines={1}>{pickupLabel}</Text>
      </View>
      {sub.passenger?.verified && (
        <Text className="text-[11px] text-primary-600 font-bold">✓</Text>
      )}
    </View>
  );
}

// ── Props ──

export interface DayVariantViewProps {
  routineTripId: string;
  recurrenceDays: RecurrenceDay[];
}

// ── Component ──

export function DayVariantView({ routineTripId, recurrenceDays }: DayVariantViewProps) {
  const [selectedDay, setSelectedDay] = useState<RecurrenceDay>(recurrenceDays[0]);

  const { routineTrip, dayStops, activeSubscriptions } = useDayVariant(routineTripId, selectedDay);

  if (!routineTrip) return null;

  return (
    <View className="flex-1">
      {/* Day selector (single-select pill row) */}
      <View className="flex-row flex-wrap gap-2 px-4 py-3">
        {recurrenceDays.map((day) => (
          <TouchableOpacity
            key={day}
            onPress={() => setSelectedDay(day)}
            className={`px-3.5 py-1.5 rounded-full border ${selectedDay === day
              ? 'bg-primary-500 border-primary-500'
              : 'border-neutral-200 bg-neutral-50'
              }`}
            activeOpacity={0.7}
          >
            <Text className={`text-xs font-medium ${selectedDay === day ? 'text-white' : 'text-neutral-600'
              }`}>
              {DAY_LABELS[day]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map */}
      <View className="flex-1 mx-4 rounded-xl overflow-hidden bg-neutral-100 min-h-[260px]">
        <OccurrenceMapView
          routeLine={routineTrip.routeLine ?? []}
          origin={{
            latitude: routineTrip.originLatitude,
            longitude: routineTrip.originLongitude,
            name: routineTrip.originName,
          }}
          destination={{
            latitude: routineTrip.destinationLatitude,
            longitude: routineTrip.destinationLongitude,
            name: routineTrip.destinationName,
          }}
          orderedStops={dayStops}
          fitOnMount
        />
      </View>

      {/* Subscribers list — scrollable so map keeps flex space */}
      <ScrollView className="max-h-[220px] px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="flex-row items-center gap-1.5 mb-3">
          <Users size={15} color={Colors.primary[500]} />
          <Text className="text-xs font-semibold text-neutral-800">
            Pasajeros los {DAY_FULL[selectedDay]} ({activeSubscriptions.length})
          </Text>
        </View>

        {activeSubscriptions.length === 0 ? (
          <View className="py-6 items-center bg-neutral-50 rounded-xl border border-neutral-100">
            <Text className="text-xs text-neutral-400">Ningún pasajero suscrito para este día</Text>
          </View>
        ) : (
          activeSubscriptions.map((sub) => (
            <SubscriberRow key={sub.id} sub={sub} />
          ))
        )}
      </ScrollView>
    </View>
  );
}
