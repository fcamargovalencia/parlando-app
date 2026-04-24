import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface ArrivalWindow {
  label: string;
  time: string; // "HH:mm"
}

interface ArrivalWindowChipProps {
  windows: ArrivalWindow[];
  selectedTime?: string;
  onSelect: (time: string) => void;
}

export function ArrivalWindowChip({ windows, selectedTime, onSelect }: ArrivalWindowChipProps) {
  if (!Array.isArray(windows) || windows.length === 0) return null;

  return (
    <View className="mb-1">
      <View className="flex-row items-center mb-2">
        <Clock size={13} color={Colors.primary[500]} />
        <Text className="text-xs text-primary-600 font-medium ml-1">
          Horarios típicos de la universidad
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {windows.map((w) => {
          const active = selectedTime === w.time;
          return (
            <TouchableOpacity
              key={`${w.label}-${w.time}`}
              onPress={() => onSelect(w.time)}
              activeOpacity={0.7}
              className={`px-3 py-1.5 rounded-full border items-center min-w-[64px] ${active
                  ? 'bg-primary-50 border-primary-500'
                  : 'bg-white border-neutral-200'
                }`}
            >
              <Text
                className={`text-xs font-semibold ${active ? 'text-primary-700' : 'text-neutral-600'}`}
              >
                {w.label}
              </Text>
              <Text
                className={`text-xs ${active ? 'text-primary-500' : 'text-neutral-400'}`}
              >
                {w.time}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
