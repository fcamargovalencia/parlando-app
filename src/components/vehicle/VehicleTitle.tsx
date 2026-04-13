import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  brand: string;
  model: string;
  color: string;
}

export function VehicleTitle({ brand, model, color }: Props) {
  return (
    <View className="px-6 pt-5 pb-3">
      <Text className="text-xl font-bold text-neutral-900">
        {brand} {model}
      </Text>
    </View>
  );
}
