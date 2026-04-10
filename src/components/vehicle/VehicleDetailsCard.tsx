import React from 'react';
import { View } from 'react-native';
import { Calendar, Palette, Users, Hash, ShieldCheck } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { formatDate } from '@/lib/utils';
import { DetailRow } from '@/components/vehicle/DetailRow';
import type { VehicleResponse } from '@/types/api';

interface Props {
  vehicle: VehicleResponse;
}

export function VehicleDetailsCard({ vehicle }: Props) {
  return (
    <View className="px-6 mb-4">
      <Card>
        <DetailRow
          icon={<Hash size={20} color={Colors.primary[600]} />}
          label="Placa"
          value={vehicle.plateNumber}
        />
        <DetailRow
          icon={<Calendar size={20} color={Colors.primary[600]} />}
          label="Año"
          value={vehicle.year?.toString()}
        />
        <DetailRow
          icon={<Palette size={20} color={Colors.primary[600]} />}
          label="Color"
          value={vehicle.color}
        />
        <DetailRow
          icon={<Users size={20} color={Colors.primary[600]} />}
          label="Capacidad"
          value={`${vehicle.capacity} pasajeros`}
        />
        <DetailRow
          icon={<ShieldCheck size={20} color={Colors.accent[600]} />}
          label="SOAT vigente hasta"
          value={vehicle.soatExpiry ? formatDate(vehicle.soatExpiry) : 'No registrado'}
          last
        />
      </Card>
    </View>
  );
}
