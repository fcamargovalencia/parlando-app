import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui';
import { Colors, Shadows } from '@/constants/colors';
import type { TripResponse, RoutineTripResponse, RecurrenceDay } from '@/types/api';

const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: 'Lun',
  TUE: 'Mar',
  WED: 'Mié',
  THU: 'Jue',
  FRI: 'Vie',
  SAT: 'Sáb',
  SUN: 'Dom',
};

interface ChatHeaderProps {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  trip?: TripResponse | null;
  routineTrip?: RoutineTripResponse | null;
  onBack: () => void;
}

export function ChatHeader({
  firstName,
  lastName,
  photoUrl,
  trip,
  routineTrip,
  onBack,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();
  const trustScore = trip?.driver?.trustScore;

  const subtitle = (() => {
    if (routineTrip) {
      const origin = (routineTrip.originSubtitle || routineTrip.originName).split(',')[0].trim();
      const dest = (routineTrip.destinationSubtitle || routineTrip.destinationName).split(',')[0].trim();
      const days = routineTrip.recurrenceDays.map((d) => DAY_LABELS[d]).join(' · ');
      return { origin, dest, days, time: routineTrip.departureTime };
    }
    if (trip) {
      const origin = (trip.originSubtitle || trip.originName).split(',')[0].trim();
      const dest = (trip.destinationSubtitle || trip.destinationName).split(',')[0].trim();
      return { origin, dest, days: null, time: null };
    }
    return null;
  })();

  return (
    <View
      className="px-4 bg-white border-b border-neutral-100"
      style={{ paddingTop: insets.top + 8, paddingBottom: 12, ...Shadows.sm }}
    >
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={onBack}
          className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center"
        >
          <ArrowLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>

        <Avatar
          uri={photoUrl || null}
          firstName={firstName}
          lastName={lastName}
          size="sm"
        />

        <View className="flex-1">
          <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
            {firstName} {lastName}
          </Text>

          <View className="flex-row items-center gap-1 mt-0.5 flex-wrap">
            {trustScore != null && (
              <>
                <Star size={12} color={Colors.accent[500]} fill={Colors.accent[500]} />
                <Text className="text-xs font-medium text-neutral-500">
                  {trustScore.toFixed(1)}
                </Text>
                {subtitle && <Text className="text-xs text-neutral-300 mx-0.5">·</Text>}
              </>
            )}
            {subtitle && (
              <>
                <Text className="text-xs font-bold" style={{ color: Colors.primary[500] }}>●</Text>
                <Text className="text-xs text-neutral-500">{subtitle.origin}</Text>
                <Text className="text-xs text-neutral-400 mx-0.5">→</Text>
                <Text className="text-xs font-bold" style={{ color: Colors.accent[500] }}>●</Text>
                <Text className="text-xs text-neutral-500">{subtitle.dest}</Text>
                {subtitle.time && (
                  <>
                    <Text className="text-xs text-neutral-300 mx-0.5">·</Text>
                    <Text className="text-xs text-neutral-500">{subtitle.time}</Text>
                  </>
                )}
                {subtitle.days && (
                  <>
                    <Text className="text-xs text-neutral-300 mx-0.5">·</Text>
                    <Text className="text-xs text-neutral-500">{subtitle.days}</Text>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
