import React from 'react';
import { View } from 'react-native';
import { Star } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface Props {
  score: number;
  size?: number;
}

export const StarRow = React.memo(function StarRow({ score, size = 14 }: Props) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          color={Colors.semantic.warning}
          fill={s <= score ? Colors.semantic.warning : 'transparent'}
        />
      ))}
    </View>
  );
});
