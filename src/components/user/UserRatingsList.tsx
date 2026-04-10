import React from 'react';
import { View, Text } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { RatingItem } from '@/components/user/RatingItem';
import type { RatingResponse } from '@/types/api';

interface Props {
  ratings: RatingResponse[];
  withComment: RatingResponse[];
}

export function UserRatingsList({ ratings, withComment }: Props) {
  return (
    <Card>
      <View className="flex-row items-center gap-2 mb-1">
        <MessageCircle size={16} color={Colors.primary[600]} />
        <Text className="text-base font-semibold text-neutral-700">Comentarios</Text>
        {withComment.length > 0 && (
          <View className="ml-auto bg-primary-100 rounded-full px-2 py-0.5">
            <Text className="text-xs font-bold text-primary-700">{withComment.length}</Text>
          </View>
        )}
      </View>

      {ratings.length === 0 ? (
        <View className="items-center py-8">
          <View className="w-14 h-14 rounded-full bg-neutral-100 items-center justify-center mb-3">
            <MessageCircle size={28} color={Colors.neutral[300]} />
          </View>
          <Text className="text-sm font-medium text-neutral-600 mb-1">
            Sin calificaciones aún
          </Text>
          <Text className="text-xs text-neutral-400 text-center px-4">
            Las calificaciones aparecerán aquí después de completar viajes.
          </Text>
        </View>
      ) : (
        ratings.map((r) => <RatingItem key={r.id} rating={r} />)
      )}
    </Card>
  );
}
