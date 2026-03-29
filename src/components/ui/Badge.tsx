import React from 'react';
import { View, Text } from 'react-native';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-100',
  warning: 'bg-yellow-100',
  error: 'bg-red-100',
  info: 'bg-blue-100',
  neutral: 'bg-neutral-100',
};

const variantTextStyles: Record<BadgeVariant, string> = {
  success: 'text-green-800',
  warning: 'text-yellow-800',
  error: 'text-red-800',
  info: 'text-blue-800',
  neutral: 'text-neutral-700',
};

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  return (
    <View className={`px-2.5 py-1 rounded-full ${variantStyles[variant]}`}>
      <Text className={`text-xs font-semibold ${variantTextStyles[variant]}`}>
        {label}
      </Text>
    </View>
  );
}
