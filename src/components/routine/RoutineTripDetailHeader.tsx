import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, Edit3 } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';

interface RoutineTripDetailHeaderProps {
  paddingTop: number;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
}

export function RoutineTripDetailHeader({
  paddingTop,
  canEdit,
  onBack,
  onEdit,
}: RoutineTripDetailHeaderProps) {
  return (
    <View
      className="flex-row items-center justify-between px-4 bg-white border-b border-neutral-100"
      style={{ paddingTop: paddingTop + 8, paddingBottom: 12, ...Shadows.sm }}
    >
      <TouchableOpacity
        onPress={onBack}
        className="w-9 h-9 items-center justify-center"
      >
        <ArrowLeft size={24} color={Colors.neutral[700]} />
      </TouchableOpacity>
      <Text className="text-base font-semibold text-neutral-900">
        Ruta rutinaria
      </Text>
      <View className="w-9">
        {canEdit && (
          <TouchableOpacity
            onPress={onEdit}
            className="w-9 h-9 items-center justify-center"
          >
            <Edit3 size={20} color={Colors.primary[600]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
