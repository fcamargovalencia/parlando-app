import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/ui';
import { DocumentRow } from '@/components/vehicle/DocumentRow';
import type { VehicleResponse } from '@/types/api';

interface Props {
  vehicle: VehicleResponse;
}

export function VehicleDocumentsCard({ vehicle }: Props) {
  return (
    <View className="px-6 mb-4">
      <Text className="text-base font-semibold text-neutral-800 mb-3">Documentos</Text>
      <Card>
        <DocumentRow label="SOAT" hasDocument={!!vehicle.soatDocumentUrl} />
        <DocumentRow
          label="Tarjeta de propiedad"
          hasDocument={!!vehicle.transitCardUrl}
          last
        />
      </Card>
    </View>
  );
}
