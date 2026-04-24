import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: React.ReactNode;
  danger?: boolean;
}

export const MenuItem = React.memo(function MenuItem({ icon, title, subtitle, onPress, badge, danger }: MenuItemProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-3.5"
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View
        className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
          danger ? 'bg-red-50' : 'bg-neutral-50'
        }`}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className={`text-base ${danger ? 'text-red-600' : 'text-neutral-900'}`}>
          {title}
        </Text>
        {subtitle && (
          <Text className="text-xs text-neutral-400 mt-0.5">{subtitle}</Text>
        )}
      </View>
      {badge}
      <ChevronRight size={18} color={Colors.neutral[300]} />
    </TouchableOpacity>
  );
});
