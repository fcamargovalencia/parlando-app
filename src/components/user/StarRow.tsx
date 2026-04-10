import React from 'react';
import { View } from 'react-native';
import { Star } from 'lucide-react-native';

interface Props {
  score: number;
  size?: number;
}

export function StarRow({ score, size = 14 }: Props) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          color="#F59E0B"
          fill={s <= score ? '#F59E0B' : 'transparent'}
        />
      ))}
    </View>
  );
}
