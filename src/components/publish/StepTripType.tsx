import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { TRIP_TYPE_OPTIONS } from '@/constants/trips';
import type { TripType } from '@/types/api';

interface Props {
  tripType: TripType;
  onSelect: (type: TripType) => void;
}

export function StepTripType({ tripType, onSelect }: Props) {
  return (
    <>
      <Text className="text-sm font-semibold text-neutral-700 mb-2">Tipo de viaje</Text>
      <View className="flex-row gap-2 mb-2">
        {TRIP_TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.type}
            onPress={() => onSelect(opt.type)}
            className={`flex-1 items-center py-4 rounded-xl border-2 ${
              tripType === opt.type
                ? 'border-primary-500 bg-primary-50'
                : 'border-neutral-200 bg-white'
            }`}
          >
            <TripTypeIcon type={opt.type} size={20} />
            <Text
              className={`text-xs font-medium mt-1 ${
                tripType === opt.type ? 'text-primary-700' : 'text-neutral-600'
              }`}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text className="text-xs text-neutral-500">
        Puedes cambiarlo más adelante antes de publicar.
      </Text>
    </>
  );
}
