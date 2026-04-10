import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface Props {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
}

export function SettingRow({ icon, label, value, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center py-3"
      activeOpacity={0.6}
    >
      <View className="w-10 h-10 rounded-xl bg-neutral-50 items-center justify-center mr-3">
        {icon}
      </View>
      <Text className="text-base text-neutral-800 flex-1">{label}</Text>
      {value && <Text className="text-sm text-neutral-400 mr-2">{value}</Text>}
      <ChevronRight size={18} color={Colors.neutral[300]} />
    </TouchableOpacity>
  );
}
