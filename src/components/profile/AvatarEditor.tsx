import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Camera } from 'lucide-react-native';
import { Avatar } from '@/components/ui';

interface Props {
  uri?: string;
  firstName: string;
  lastName: string;
  onPressCamera?: () => void;
}

export function AvatarEditor({ uri, firstName, lastName, onPressCamera }: Props) {
  return (
    <View className="items-center mb-8">
      <View className="relative">
        <Avatar size="xl" uri={uri} firstName={firstName} lastName={lastName} />
        <TouchableOpacity
          onPress={onPressCamera}
          className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary-600 items-center justify-center border-3 border-white"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          }}
          activeOpacity={0.7}
        >
          <Camera size={18} color="white" />
        </TouchableOpacity>
      </View>
      <Text className="text-sm text-neutral-400 mt-3">
        Toca la cámara para cambiar tu foto
      </Text>
    </View>
  );
}
