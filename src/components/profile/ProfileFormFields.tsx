import React from 'react';
import { View } from 'react-native';
import { Input } from '@/components/ui';

interface Props {
  firstName: string;
  lastName: string;
  onChangeFirstName: (v: string) => void;
  onChangeLastName: (v: string) => void;
}

export function ProfileFormFields({
  firstName,
  lastName,
  onChangeFirstName,
  onChangeLastName,
}: Props) {
  return (
    <View className="gap-4 mb-6">
      <Input
        label="Nombre"
        placeholder="Tu nombre"
        value={firstName}
        onChangeText={onChangeFirstName}
        autoCapitalize="words"
      />
      <Input
        label="Apellido"
        placeholder="Tu apellido"
        value={lastName}
        onChangeText={onChangeLastName}
        autoCapitalize="words"
      />
    </View>
  );
}
