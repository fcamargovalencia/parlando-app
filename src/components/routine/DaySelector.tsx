import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { RecurrenceDay } from '@/types/api';

const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: 'Lun',
  TUE: 'Mar',
  WED: 'Mié',
  THU: 'Jue',
  FRI: 'Vie',
  SAT: 'Sáb',
  SUN: 'Dom',
};

const ALL_DAYS: RecurrenceDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface DaySelectorProps {
  selected: RecurrenceDay[];
  onChange: (days: RecurrenceDay[]) => void;
  error?: string;
}

export function DaySelector({ selected, onChange, error }: DaySelectorProps) {
  const toggle = (day: RecurrenceDay) => {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day]);
    }
  };

  return (
    <View>
      <View className="flex-row flex-wrap gap-2">
        {ALL_DAYS.map((day) => {
          const active = selected.includes(day);
          return (
            <TouchableOpacity
              key={day}
              onPress={() => toggle(day)}
              activeOpacity={0.7}
              className={`px-3.5 py-2 rounded-full border ${active
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-300'
                }`}
            >
              <Text
                className={`text-sm font-semibold ${active ? 'text-white' : 'text-neutral-700'}`}
              >
                {DAY_LABELS[day]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? (
        <Text className="text-red-500 text-xs mt-1.5">{error}</Text>
      ) : null}
    </View>
  );
}
