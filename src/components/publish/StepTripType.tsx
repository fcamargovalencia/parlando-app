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
      <Text className="text-sm font-semibold text-neutral-700 mb-3">Tipo de viaje</Text>
      <View className="gap-2 mb-2">
        {TRIP_TYPE_OPTIONS.map((opt) => {
          const active = tripType === opt.type;
          return (
            <TouchableOpacity
              key={opt.type}
              onPress={() => onSelect(opt.type)}
              activeOpacity={0.8}
              className={`flex-row items-center px-4 py-3.5 rounded-xl border-2 ${active ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 bg-white'
                }`}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: active ? 'rgba(var(--color-primary-100), 1)' : '#F3F4F6' }}
              >
                <TripTypeIcon type={opt.type} size={20} />
              </View>
              <View className="flex-1">
                <Text
                  className={`text-sm font-semibold ${active ? 'text-primary-700' : 'text-neutral-800'
                    }`}
                >
                  {opt.label}
                </Text>
                <Text
                  className={`text-xs mt-0.5 ${active ? 'text-primary-500' : 'text-neutral-400'
                    }`}
                >
                  {opt.subtitle}
                </Text>
              </View>
              <View
                className={`w-5 h-5 rounded-full border-2 items-center justify-center ml-2 ${active ? 'border-primary-500' : 'border-neutral-300'
                  }`}
              >
                {active && (
                  <View className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {tripType === 'ROUTINE' ? (
        <Text className="text-xs text-primary-600 mt-1">
          Serás guiado por el flujo de configuración de ruta rutinaria. ›
        </Text>
      ) : (
        <Text className="text-xs text-neutral-500">
          Puedes cambiarlo más adelante antes de publicar.
        </Text>
      )}
    </>
  );
}
