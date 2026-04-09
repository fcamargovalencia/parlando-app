import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Banknote,
  Ban,
  Car,
  ChevronRight,
  Clock,
  Luggage,
  Star,
  Users,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import { Avatar, Badge, Card } from '@/components/ui';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { Colors } from '@/constants/colors';
import { formatCurrency, formatDeparture, getTripTypeLabel } from '@/lib/utils';
import type { TripResponse } from '@/types/api';

interface SearchTripCardProps {
  trip: TripResponse;
  onPress: () => void;
}

// ── Subsections ──

function CardHeader({ trip, noSeats }: { trip: TripResponse; noSeats: boolean; }) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-row items-center gap-1.5">
        <TripTypeIcon type={trip.tripType} />
        <Text className="text-sm font-medium text-neutral-500">
          {getTripTypeLabel(trip.tripType)}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        {noSeats && <Badge label="Sin cupos" variant="error" />}
        {trip.studentsOnly && <Badge label="Estudiantes" variant="info" />}
      </View>
    </View>
  );
}

function RouteSection({ trip }: { trip: TripResponse; }) {
  return (
    <View className="flex-row items-start mb-4">
      <View className="items-center mr-3 pt-1.5">
        <View className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.primary[500] }} />
        <View className="w-0.5 h-14 my-1" style={{ backgroundColor: Colors.neutral[200] }} />
        <View className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.accent[500] }} />
      </View>
      <View className="flex-1 gap-3">
        <View>
          <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
            {trip.originName}
          </Text>
          {!!trip.originSubtitle && (
            <Text className="text-sm text-neutral-500" numberOfLines={1}>
              {trip.originSubtitle}
            </Text>
          )}
        </View>
        <View>
          <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
            {trip.destinationName}
          </Text>
          {!!trip.destinationSubtitle && (
            <Text className="text-sm text-neutral-500" numberOfLines={1}>
              {trip.destinationSubtitle}
            </Text>
          )}
        </View>
      </View>
      <ChevronRight size={20} color={Colors.neutral[600]} strokeWidth={2.5} />
    </View>
  );
}

function TimeRow({ trip }: { trip: TripResponse; }) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-row items-center gap-1.5">
        <Clock size={14} color={Colors.neutral[400]} />
        <Text className="text-sm font-semibold text-neutral-700">
          {formatDeparture(trip.departureAt)}
        </Text>
      </View>
      {trip.arrivedAt && (
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs text-neutral-400">Llega</Text>
          <Clock size={14} color={Colors.accent[400]} />
          <Text className="text-sm font-medium text-neutral-600">
            {dayjs(trip.arrivedAt).format('h:mm A')}
          </Text>
        </View>
      )}
    </View>
  );
}

function StatsRow({ trip }: { trip: TripResponse; }) {
  return (
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-1 flex-row items-center justify-center gap-1.5">
        <Users size={15} color={Colors.primary[500]} />
        <Text className="text-sm font-semibold text-neutral-700">
          {trip.availableSeats} {trip.availableSeats === 1 ? 'cupo' : 'cupos'}
        </Text>
      </View>
      <View className="w-px h-5 bg-neutral-200" />
      <View className="flex-1 flex-row items-center justify-center gap-1.5">
        <Banknote size={15} color={Colors.primary[500]} />
        <Text className="text-sm font-bold text-neutral-800">
          {formatCurrency(trip.pricePerSeat, trip.currency)}
        </Text>
      </View>
      <View className="w-px h-5 bg-neutral-200" />
      <View className="flex-1 flex-row items-center justify-center gap-1.5">
        {trip.allowsLuggage ? (
          <>
            <Luggage size={15} color={Colors.primary[500]} />
            <Text className="text-sm font-semibold text-neutral-700">Equipaje</Text>
          </>
        ) : (
          <>
            <Ban size={15} color={Colors.neutral[400]} />
            <Text className="text-sm text-neutral-400">Sin equipaje</Text>
          </>
        )}
      </View>
    </View>
  );
}

function DriverFooter({ driver }: { driver: NonNullable<TripResponse['driver']>; }) {
  return (
    <View className="flex-row items-center gap-3 pt-3 border-t border-neutral-100">
      <Avatar
        uri={driver.profilePhotoUrl}
        firstName={driver.firstName}
        lastName={driver.lastName}
        size="md"
        verified
      />
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Car size={16} color={Colors.neutral[500]} />
          <Text className="text-base font-semibold text-neutral-800">
            {driver.firstName} {driver.lastName}
          </Text>
        </View>
        <View className="flex-row items-center gap-1 mt-0.5">
          <Star size={12} color="#F59E0B" fill="#F59E0B" />
          <Text className="text-sm font-medium text-neutral-600">
            {driver.trustScore.toFixed(1)}
          </Text>
          <Text className="text-xs text-neutral-400">/ 5</Text>
        </View>
      </View>
    </View>
  );
}

// ── Card ──

export function SearchTripCard({ trip, onPress }: SearchTripCardProps) {
  const noSeats = trip.availableSeats === 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} disabled={noSeats}>
      <Card className="mb-3" style={noSeats ? { opacity: 0.55 } : undefined}>
        <CardHeader trip={trip} noSeats={noSeats} />
        <RouteSection trip={trip} />
        <TimeRow trip={trip} />
        <StatsRow trip={trip} />
        {trip.driver && <DriverFooter driver={trip.driver} />}
      </Card>
    </TouchableOpacity>
  );
}
