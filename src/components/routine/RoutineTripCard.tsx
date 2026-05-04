import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Banknote, Clock, Lock, Map, MapPin, MessageCircle, Users } from 'lucide-react-native';
import { Avatar, Card } from '@/components/ui';
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
  onRoutePress?: () => void;
  onContactPress?: () => void;
}

export const RoutineTripCard = React.memo(function RoutineTripCard({ result, onPress, onRoutePress, onContactPress }: RoutineTripCardProps) {
  const {
    driverName, originName, destinationName, departureTime, requiredArrivalTime,
    recurrenceDays, pricePerSeat, currency, availableSeats,
    requiresStudentVerification, allowsLuggage, allowsCustomPickup,
  } = result;

  const firstName = driverName.split(' ')[0];
  const lastName = driverName.split(' ')[1] ?? '';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card className="mb-3 p-4">
        {/* Header: driver info + student-only badge */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2.5">
            <Avatar firstName={firstName} lastName={lastName} size="sm" />
            <Text className="text-sm font-semibold text-neutral-900">{driverName}</Text>
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
            <Text className="text-sm text-neutral-700" numberOfLines={1}>{originName}</Text>
            <Text className="text-sm font-semibold text-neutral-900 mt-2" numberOfLines={1}>{destinationName}</Text>
          </View>
        </View>

        {/* Schedule */}
        <View className="flex-row items-center gap-1.5 mb-3">
          <Clock size={13} color={Colors.neutral[400]} />
          <Text className="text-sm text-neutral-600">
            {departureTime} → llega antes de {requiredArrivalTime}
          </Text>
        </View>

        {/* Days */}
        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {recurrenceDays.map((day) => (
            <View key={day} className="px-2.5 py-1 rounded-full bg-primary-50">
              <Text className="text-xs font-semibold text-primary-700">{DAY_LABELS[day]}</Text>
            </View>
          ))}
        </View>

        {/* Extras */}
        {(allowsLuggage || allowsCustomPickup) && (
          <View className="flex-row gap-2 mb-3">
            {allowsLuggage && (
              <View className="px-2.5 py-1 rounded-full bg-neutral-100">
                <Text className="text-xs text-neutral-500">Equipaje</Text>
              </View>
            )}
            {allowsCustomPickup && (
              <View className="px-2.5 py-1 rounded-full bg-neutral-100">
                <Text className="text-xs text-neutral-500">Recogida flexible</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer: price + route button */}
        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100">
          <View className="flex-row items-center gap-1.5">
            <Banknote size={14} color={Colors.neutral[500]} />
            <Text className="text-base font-bold text-neutral-900">
              {formatCurrency(pricePerSeat, currency)}
            </Text>
            <Text className="text-xs text-neutral-400">/ cupo</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Users size={14} color={Colors.neutral[400]} />
              <Text className="text-xs text-neutral-500">{availableSeats} cupos</Text>
            </View>
            {onRoutePress && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onRoutePress(); }}
                activeOpacity={0.7}
                className="flex-row items-center gap-1 bg-primary-50 px-2.5 py-1.5 rounded-full"
              >
                <Map size={12} color={Colors.primary[600]} />
                <Text className="text-xs font-semibold text-primary-700">Ver ruta</Text>
              </TouchableOpacity>
            )}
            {onContactPress && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onContactPress(); }}
                activeOpacity={0.7}
                className="flex-row items-center gap-1 bg-neutral-100 px-2.5 py-1.5 rounded-full"
              >
                <MessageCircle size={12} color={Colors.neutral[600]} />
                <Text className="text-xs font-semibold text-neutral-700">Contactar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
});
