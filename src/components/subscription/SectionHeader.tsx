import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  number: number;
  title: string;
}

export function SectionHeader({ number, title }: Props) {
  return (
    <View className="flex-row items-center gap-2 mb-3">
      <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
        <Text className="text-xs font-bold text-white">{number}</Text>
      </View>
      <Text className="text-base font-bold text-neutral-900">{title}</Text>
    </View>
  );
}
