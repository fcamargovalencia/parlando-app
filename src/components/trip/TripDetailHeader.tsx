import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, Edit3 } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';

interface TripDetailHeaderProps {
  paddingTop: number;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
}

export function TripDetailHeader({ paddingTop, canEdit, onBack, onEdit }: TripDetailHeaderProps) {
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
        Detalle del viaje
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
