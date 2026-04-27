import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface Props {
  value: Date | null;
  placeholder: string;
  onPress: () => void;
  error?: string;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function DateField({ value, placeholder, onPress, error }: Props) {
  const hasError = !!error;
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border ${hasError ? 'border-red-400 bg-red-50' : 'border-neutral-200 bg-white'}`}
      >
        <Calendar size={16} color={hasError ? Colors.semantic.error : Colors.neutral[400]} />
        <Text className={`text-base flex-1 ${value ? 'text-neutral-900' : 'text-neutral-400'}`}>
          {value ? fmtDate(value) : placeholder}
        </Text>
      </TouchableOpacity>
      {hasError && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}
