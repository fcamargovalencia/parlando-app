import React from 'react';
import { View, Text } from 'react-native';
import { Clock, Users, Luggage, Banknote, Ban, GraduationCap } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { formatCurrency, formatDeparture } from '@/lib/utils';
import type { TripResponse } from '@/types/api';

interface TripInfoCardProps {
  trip: TripResponse;
}

export function TripInfoCard({ trip }: TripInfoCardProps) {
  return (
    <Card>
      {/* Departure / Arrival */}
      <View className="flex-row items-start gap-3 py-2.5 border-b border-neutral-100">
        <View className="mt-0.5">
          <Clock size={16} color={Colors.neutral[400]} />
        </View>
        <View className="flex-1 flex-row justify-between">
          <View>
            <Text className="text-sm text-neutral-400 mb-0.5">Salida</Text>
            <Text className="text-base font-medium text-neutral-900">
              {formatDeparture(trip.departureAt)}
            </Text>
          </View>
          <View className="items-end">
            <View className="flex-row items-center gap-1 mb-0.5">
              <Clock size={14} color={Colors.accent[500]} />
              <Text className="text-sm text-neutral-400">Llegada estimada</Text>
            </View>
            <Text className="text-base font-medium text-neutral-900">
              {trip.arrivedAt ? formatDeparture(trip.arrivedAt) : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Seats / Price / Luggage */}
      <View className="flex-row items-center justify-between py-2.5 border-b border-neutral-100">
        <View className="flex-row items-center gap-1.5">
          <Users size={15} color={Colors.neutral[400]} />
          <Text className="text-base font-medium text-neutral-900">
            {trip.availableSeats} disponibles
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Banknote size={15} color={Colors.neutral[400]} />
          <Text className="text-base font-medium text-neutral-900">
            {formatCurrency(trip.pricePerSeat, trip.currency)}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Luggage
            size={15}
            color={trip.allowsLuggage ? Colors.neutral[400] : Colors.neutral[300]}
          />
          <Text
            className={`text-base font-medium ${trip.allowsLuggage ? 'text-neutral-900' : 'text-neutral-300'
              }`}
          >
            Equipaje
          </Text>
          {!trip.allowsLuggage && <Ban size={13} color="#EF4444" />}
        </View>
      </View>

      {/* Students only (routine trips) */}
      {trip.tripType === 'ROUTINE' && (
        <View className="flex-row items-start gap-3 py-2.5 border-b border-neutral-100">
          <View className="mt-0.5">
            <GraduationCap size={16} color={Colors.neutral[400]} />
          </View>
          <View className="flex-1">
            <Text className="text-sm text-neutral-400 mb-0.5">Solo estudiantes</Text>
            <Text className="text-base font-medium text-neutral-900">
              {trip.studentsOnly ? 'Sí' : 'No'}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}
