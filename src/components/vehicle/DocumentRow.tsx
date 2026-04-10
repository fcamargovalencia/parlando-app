import React from 'react';
import { View, Text } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { Badge } from '@/components/ui';
import { Colors } from '@/constants/colors';

interface Props {
  label: string;
  hasDocument: boolean;
  last?: boolean;
}

export function DocumentRow({ label, hasDocument, last = false }: Props) {
  return (
    <View className={`flex-row items-center py-3 ${!last ? 'border-b border-neutral-100' : ''}`}>
      <View
        className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${
          hasDocument ? 'bg-green-100' : 'bg-red-50'
        }`}
      >
        <ShieldCheck size={16} color={hasDocument ? Colors.primary[600] : '#EF4444'} />
      </View>
      <Text className="text-sm text-neutral-700 flex-1">{label}</Text>
      <Badge
        variant={hasDocument ? 'success' : 'error'}
        label={hasDocument ? 'Cargado' : 'Pendiente'}
      />
    </View>
  );
}
