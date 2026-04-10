import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';

interface Props {
  paddingTop: number;
  onBack: () => void;
}

export function UserProfileHeader({ paddingTop, onBack }: Props) {
  return (
    <View
      className="flex-row items-center px-4 bg-white border-b border-neutral-100"
      style={{ paddingTop: paddingTop + 8, paddingBottom: 12, ...Shadows.sm }}
    >
      <TouchableOpacity
        onPress={onBack}
        className="w-9 h-9 items-center justify-center mr-2"
      >
        <ArrowLeft size={24} color={Colors.neutral[700]} />
      </TouchableOpacity>
      <Text className="text-base font-semibold text-neutral-900">Perfil</Text>
    </View>
  );
}
