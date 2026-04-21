import React from 'react';
import { View, Text } from 'react-native';

interface ReliabilityBadgeProps {
  score: number; // 0–100
}

export function ReliabilityBadge({ score }: ReliabilityBadgeProps) {
  const bgColor = score >= 90 ? 'bg-green-100' : score >= 75 ? 'bg-yellow-100' : 'bg-red-100';
  const textColor =
    score >= 90 ? 'text-green-800' : score >= 75 ? 'text-yellow-800' : 'text-red-800';

  return (
    <View className={`flex-row items-center px-2 py-0.5 rounded-full ${bgColor}`}>
      <Text className={`text-xs font-semibold ${textColor}`}>{Math.round(score)}% fiable</Text>
    </View>
  );
}
