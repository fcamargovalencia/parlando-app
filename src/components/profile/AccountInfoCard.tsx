import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/ui';

interface Props {
  email?: string;
  phone?: string;
  role?: string;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="py-2">
      <Text className="text-xs text-neutral-400 mb-0.5">{label}</Text>
      <Text className="text-sm text-neutral-600">{value || '-'}</Text>
    </View>
  );
}

export function AccountInfoCard({ email, phone, role }: Props) {
  return (
    <>
      <Text className="text-base font-semibold text-neutral-800 mb-3">
        Información de la cuenta
      </Text>
      <Card className="mb-6">
        <InfoRow label="Correo electrónico" value={email ?? ''} />
        <View className="h-px bg-neutral-100 my-2" />
        <InfoRow label="Teléfono" value={phone ?? ''} />
        <View className="h-px bg-neutral-100 my-2" />
        <InfoRow label="Rol" value={role?.toLowerCase() ?? ''} />
      </Card>
    </>
  );
}
