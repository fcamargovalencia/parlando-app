import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Colors } from '@/constants/colors';

interface SpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export function Spinner({ size = 'large', message, fullScreen = false }: SpinnerProps) {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-muted">
        <ActivityIndicator size={size} color={Colors.primary[500]} />
        {message && (
          <Text className="text-sm text-neutral-500 mt-3">{message}</Text>
        )}
      </View>
    );
  }

  return (
    <View className="items-center justify-center py-8">
      <ActivityIndicator size={size} color={Colors.primary[500]} />
      {message && (
        <Text className="text-sm text-neutral-500 mt-3">{message}</Text>
      )}
    </View>
  );
}
