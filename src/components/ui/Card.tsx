import React from 'react';
import { View, Text, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <View
      className={`bg-white rounded-2xl p-4 border border-neutral-100 ${className}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
      {...props}
    >
      {children}
    </View>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900">{title}</Text>
        {subtitle && (
          <Text className="text-sm text-neutral-500 mt-0.5">{subtitle}</Text>
        )}
      </View>
      {action}
    </View>
  );
}
