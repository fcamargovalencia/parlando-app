import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface EmptySearchResultsProps {
  onBack: () => void;
}

export function EmptySearchResults({ onBack }: EmptySearchResultsProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16 gap-4">
      <View className="w-20 h-20 rounded-full bg-neutral-100 items-center justify-center mb-2">
        <Search size={36} color={Colors.neutral[300]} />
      </View>
      <Text className="text-lg font-bold text-neutral-800 text-center">
        Sin resultados
      </Text>
      <Text className="text-sm text-neutral-500 text-center leading-5">
        No encontramos viajes para esa ruta y fecha. Intenta ampliar el radio de
        búsqueda o cambiar la fecha.
      </Text>
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.8}
        className="mt-2 px-6 py-3 rounded-2xl"
        style={{ backgroundColor: Colors.primary[600] }}
      >
        <Text className="text-white font-semibold text-sm">Modificar búsqueda</Text>
      </TouchableOpacity>
    </View>
  );
}
