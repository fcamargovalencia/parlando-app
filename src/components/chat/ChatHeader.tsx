import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui';
import { Colors, Shadows } from '@/constants/colors';
import type { TripResponse } from '@/types/api';

interface ChatHeaderProps {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  trip: TripResponse | null;
  onBack: () => void;
}

export function ChatHeader({
  firstName,
  lastName,
  photoUrl,
  trip,
  onBack,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();
  const trustScore = trip?.driver?.trustScore;

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
                {trip && <Text className="text-xs text-neutral-300 mx-0.5">·</Text>}
              </>
            )}
            {trip && (() => {
              const origin = (trip.originSubtitle || trip.originName).split(',')[0].trim();
              const dest = (trip.destinationSubtitle || trip.destinationName).split(',')[0].trim();
              return (
                <>
                  <Text className="text-xs font-bold" style={{ color: Colors.primary[500] }}>●</Text>
                  <Text className="text-xs text-neutral-500">{origin}</Text>
                  <Text className="text-xs text-neutral-400 mx-0.5">→</Text>
                  <Text className="text-xs font-bold" style={{ color: Colors.accent[500] }}>●</Text>
                  <Text className="text-xs text-neutral-500">{dest}</Text>
                </>
              );
            })()}
          </View>
        </View>
      </View>
    </View>
  );
}
