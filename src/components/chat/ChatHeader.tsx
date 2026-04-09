import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, Star, Circle, MapPin } from 'lucide-react-native';
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
          className="w-9 h-9 items-center justify-center"
        >
          <ArrowLeft size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>

        <Avatar
          uri={photoUrl || null}
          firstName={firstName}
          lastName={lastName}
          size="sm"
        />

        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text
              className="text-base font-semibold text-neutral-900"
              numberOfLines={1}
            >
              {firstName} {lastName}
            </Text>
            {trustScore != null && (
              <View className="flex-row items-center gap-0.5 ml-1">
                <Star size={13} color={Colors.accent[500]} fill={Colors.accent[500]} />
                <Text className="text-xs font-medium text-neutral-600">
                  {trustScore.toFixed(1)}
                </Text>
              </View>
            )}
          </View>

          {trip && (
            <View className="gap-0.5 mt-0.5">
              <View className="flex-row items-center gap-1">
                <Circle size={8} color={Colors.semantic.success} fill={Colors.semantic.success} />
                <Text className="text-xs text-neutral-500" numberOfLines={1}>
                  {trip.originSubtitle || trip.originName}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <MapPin size={8} color={Colors.semantic.error} />
                <Text className="text-xs text-neutral-500" numberOfLines={1}>
                  {trip.destinationSubtitle || trip.destinationName}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
