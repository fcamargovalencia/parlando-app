import React from 'react';
import { View, Text } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export function EmptyConversations() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: Colors.primary[50] }}
      >
        <MessageCircle size={40} color={Colors.primary[400]} />
      </View>
      <Text className="text-lg font-semibold text-neutral-700 mb-2 text-center">
        Sin conversaciones
      </Text>
      <Text className="text-sm text-neutral-400 text-center leading-5">
        Cuando contactes a un conductor o te escriban sobre un viaje, tus conversaciones aparecerán aquí.
      </Text>
    </View>
  );
}
