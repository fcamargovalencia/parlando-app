import React from 'react';
import { View, Text } from 'react-native';
import dayjs from 'dayjs';
import { StarRow } from '@/components/user/StarRow';
import type { RatingResponse } from '@/types/api';

interface Props {
  rating: RatingResponse;
}

export const RatingItem = React.memo(function RatingItem({ rating }: Props) {
  return (
    <View className="py-3 border-b border-neutral-100">
      <View className="flex-row items-center justify-between mb-1.5">
        <StarRow score={rating.score} />
        <Text className="text-xs text-neutral-400">
          {dayjs(rating.createdAt).format('D MMM YYYY')}
        </Text>
      </View>
      {rating.comment ? (
        <Text className="text-sm text-neutral-700 leading-5">{rating.comment}</Text>
      ) : (
        <Text className="text-sm text-neutral-400 italic">Sin comentario</Text>
      )}
    </View>
  );
});
