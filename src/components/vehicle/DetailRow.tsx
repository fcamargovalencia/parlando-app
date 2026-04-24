import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  icon: React.ReactNode;
  label: string;
  value?: string;
  last?: boolean;
}

export const DetailRow = React.memo(function DetailRow({ icon, label, value, last = false }: Props) {
  return (
    <View className={`flex-row items-center py-3 ${!last ? 'border-b border-neutral-100' : ''}`}>
      <View className="mr-3">{icon}</View>
      <Text className="text-sm text-neutral-500 flex-1">{label}</Text>
      <Text className="text-sm font-medium text-neutral-800">{value || '-'}</Text>
    </View>
  );
});
