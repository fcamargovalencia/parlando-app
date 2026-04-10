import React from 'react';
import { View, Text } from 'react-native';
import { APP } from '@/constants/config';

export function AppFooter() {
  return (
    <View className="items-center py-4">
      <Text className="text-sm text-neutral-400">
        {APP.NAME} v{APP.VERSION}
      </Text>
      <Text className="text-xs text-neutral-300 mt-1">Hecho con ❤️ en Colombia</Text>
    </View>
  );
}
