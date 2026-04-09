import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { Colors } from '@/constants/colors';
import { TRIP_TYPE_OPTIONS } from '@/constants/trips';
import type { TripType } from '@/types/api';

interface TripTypeQuickActionsProps {
  tripType: TripType;
  onSelect: (type: TripType) => void;
}

export function TripTypeQuickActions({ tripType, onSelect }: TripTypeQuickActionsProps) {
  return (
    <View className="px-5 pt-6 pb-2">
      <Text className="text-base font-bold text-neutral-900 mb-3">Tipo de viaje</Text>
      <View className="flex-row gap-3">
        {TRIP_TYPE_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t.type}
            onPress={() => onSelect(t.type)}
            activeOpacity={0.8}
            className="flex-1 rounded-2xl p-3.5 items-center"
            style={{
              backgroundColor: tripType === t.type ? Colors.primary[50] : '#F8F9FA',
              borderWidth: 1.5,
              borderColor: tripType === t.type ? Colors.primary[300] : '#F0F0F0',
            }}
          >
            <TripTypeIcon type={t.type} size={22} />
            <Text
              className="text-xs font-semibold mt-2 text-center"
              style={{ color: Colors.neutral[700] }}
            >
              {t.label}
            </Text>
            <Text
              className="text-xs mt-0.5 text-center"
              style={{ color: Colors.neutral[400] }}
              numberOfLines={1}
            >
              {t.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
