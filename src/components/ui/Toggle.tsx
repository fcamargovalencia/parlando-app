import React from 'react';
import { View, TouchableOpacity } from 'react-native';

export function Toggle({ value, onPress }: { value: boolean; onPress: () => void; }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`w-12 h-7 rounded-full justify-center px-0.5 ${value ? 'bg-primary-500' : 'bg-neutral-200'}`}
    >
      <View
        className={`w-6 h-6 rounded-full bg-white ${value ? 'self-end' : 'self-start'}`}
        style={{ elevation: 2 }}
      />
    </TouchableOpacity>
  );
}
