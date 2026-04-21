import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Banknote, Clock, Lock, MapPin, Star, Users } from 'lucide-react-native';
import { Avatar, Badge, Card } from '@/components/ui';
import { ReliabilityBadge } from './ReliabilityBadge';
import { Colors } from '@/constants/colors';
import { formatCurrency } from '@/lib/utils';
import type { RecurrenceDay, RoutineTripSearchResult } from '@/types/api';

const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: 'Lun',
  TUE: 'Mar',
  WED: 'Mié',
  THU: 'Jue',
  FRI: 'Vie',
  SAT: 'Sáb',
  SUN: 'Dom',
};

interface RoutineTripCardProps {
  result: RoutineTripSearchResult;
  onPress: () => void;
}

export function RoutineTripCard({ result, onPress }: RoutineTripCardProps) {
  const { driver, vehicle, origin, destination, departureTime, requiredArrivalTime,
    recurrenceDays, pricePerSeat, currency, availableSeatsForDays,
    nearestWaypointDistanceMeters, nearestWaypoint, requiresStudentVerification } = result;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card className="mb-3 p-4">
        {/* Header: driver info + student-only badge */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2.5">
            <Avatar firstName={driver.name.split(' ')[0]} lastName={driver.name.split(' ')[1] ?? ''} size="sm" />
            <View>
              <Text className="text-sm font-semibold text-neutral-900">{driver.name}</Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-xs text-neutral-500">{driver.rating.toFixed(1)}</Text>
                <ReliabilityBadge score={driver.reliabilityScore * 100} />
              </View>
            </View>
          </View>
          {requiresStudentVerification && (
            <View className="flex-row items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
              <Lock size={12} color={Colors.semantic?.info ?? '#3B82F6'} />
              <Text className="text-xs text-blue-700 font-medium">Estudiantes</Text>
            </View>
          )}
        </View>

        {/* Route */}
        <View className="flex-row items-start gap-2 mb-3">
          <View className="items-center pt-0.5">
            <View className="w-2 h-2 rounded-full bg-primary-500" />
            <View className="w-px flex-1 bg-neutral-200 my-0.5" style={{ minHeight: 16 }} />
            <MapPin size={12} color={Colors.accent[500]} />
          </View>
          <View className="flex-1">
            <Text className="text-sm text-neutral-700" numberOfLines={1}>{origin.name}</Text>
            <Text className="text-sm font-semibold text-neutral-900 mt-2" numberOfLines={1}>{destination.name}</Text>
          </View>
        </View>

        {/* Schedule */}
        <View className="flex-row items-center gap-1.5 mb-2">
          <Clock size={13} color={Colors.neutral[400]} />
          <Text className="text-sm text-neutral-600">
            {departureTime} → llega antes de {requiredArrivalTime}
          </Text>
        </View>

        {/* Vehicle */}
        <Text className="text-xs text-neutral-500 mb-3">
          {vehicle.model} · {vehicle.color} · {vehicle.plate}
        </Text>

        {/* Days with seats */}
        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {recurrenceDays.map((day) => {
            const seats = availableSeatsForDays[day];
            const hasSeats = seats !== undefined && seats > 0;
            return (
              <View
                key={day}
                className={`px-2.5 py-1 rounded-full ${hasSeats ? 'bg-primary-50' : 'bg-neutral-100'}`}
              >
                <Text className={`text-xs font-semibold ${hasSeats ? 'text-primary-700' : 'text-neutral-400'}`}>
                  {DAY_LABELS[day]} {hasSeats ? `(${seats})` : '—'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Nearest waypoint info */}
        {nearestWaypoint && nearestWaypointDistanceMeters !== undefined && (
          <View className="flex-row items-center gap-1.5 bg-neutral-50 rounded-xl px-3 py-2 mb-3">
            <MapPin size={12} color={Colors.primary[500]} />
            <Text className="text-xs text-neutral-600 flex-1" numberOfLines={1}>
              Parada más cercana:{' '}
              <Text className="font-semibold">{nearestWaypoint.name}</Text>
              {' '}a {Math.round(nearestWaypointDistanceMeters)}m · paso a las {nearestWaypoint.estimatedPickupTime}
            </Text>
          </View>
        )}

        {/* Footer: price */}
        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100">
          <View className="flex-row items-center gap-1.5">
            <Banknote size={14} color={Colors.neutral[500]} />
            <Text className="text-base font-bold text-neutral-900">
              {formatCurrency(pricePerSeat, currency)}
            </Text>
            <Text className="text-xs text-neutral-400">/ cupo</Text>
          </View>
          {driver.verified && (
            <Badge label="Verificado" variant="success" />
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}
