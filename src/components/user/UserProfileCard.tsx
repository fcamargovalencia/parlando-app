import React from 'react';
import { View, Text } from 'react-native';
import { Star, MessageCircle } from 'lucide-react-native';
import { Avatar, Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { StarRow } from '@/components/user/StarRow';
import type { UserResponse, RatingResponse } from '@/types/api';

interface Props {
  user: UserResponse;
  ratings: RatingResponse[];
  avgScore: number | null;
}

export function UserProfileCard({ user, ratings, avgScore }: Props) {
  return (
    <Card>
      <View className="items-center py-2">
        <Avatar
          uri={user.profilePhotoUrl}
          firstName={user.firstName}
          lastName={user.lastName}
          size="xl"
        />
        <Text className="text-xl font-bold text-neutral-900 mt-3">
          {user.firstName} {user.lastName}
        </Text>

        <View className="flex-row items-center gap-4 mt-3">
          <View className="items-center">
            <View className="flex-row items-center gap-1.5 mb-0.5">
              <Star size={18} color="#F59E0B" fill="#F59E0B" />
              <Text className="text-xl font-bold text-neutral-900">
                {user.trustScore.toFixed(1)}
              </Text>
            </View>
            <Text className="text-xs text-neutral-400">Puntuación</Text>
          </View>

          <View className="w-px h-8 bg-neutral-200" />

          <View className="items-center">
            <View className="flex-row items-center gap-1.5 mb-0.5">
              <MessageCircle size={18} color={Colors.neutral[500]} />
              <Text className="text-xl font-bold text-neutral-900">{ratings.length}</Text>
            </View>
            <Text className="text-xs text-neutral-400">
              {ratings.length === 1 ? 'Calificación' : 'Calificaciones'}
            </Text>
          </View>

          {avgScore !== null && (
            <>
              <View className="w-px h-8 bg-neutral-200" />
              <View className="items-center">
                <StarRow score={Math.round(avgScore)} size={16} />
                <Text className="text-xs text-neutral-400 mt-0.5">
                  {avgScore.toFixed(1)} promedio
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Card>
  );
}
