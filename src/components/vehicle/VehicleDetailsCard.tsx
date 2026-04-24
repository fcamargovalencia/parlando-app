import React from 'react';
import { View } from 'react-native';
import { Calendar, Palette, Users, Hash, ShieldCheck } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { formatDate } from '@/lib/utils';
import { DetailRow } from '@/components/ui';
import type { VehicleResponse } from '@/types/api';

const ICON_HASH = <Hash size={20} color={Colors.primary[600]} />;
const ICON_CALENDAR = <Calendar size={20} color={Colors.primary[600]} />;
const ICON_PALETTE = <Palette size={20} color={Colors.primary[600]} />;
const ICON_USERS = <Users size={20} color={Colors.primary[600]} />;
const ICON_SHIELD = <ShieldCheck size={20} color={Colors.accent[600]} />;

interface Props {
  vehicle: VehicleResponse;
}

export const VehicleDetailsCard = React.memo(function VehicleDetailsCard({ vehicle }: Props) {
  return (
    <View className="px-6 mb-4">
      <Card>
        <DetailRow
          icon={ICON_HASH}
          label="Placa"
          value={vehicle.plateNumber}
        />
        <DetailRow
          icon={ICON_CALENDAR}
          label="Año"
          value={vehicle.year?.toString()}
        />
        <DetailRow
          icon={ICON_PALETTE}
          label="Color"
          value={vehicle.color}
        />
        <DetailRow
          icon={ICON_USERS}
          label="Capacidad"
          value={`${vehicle.capacity} pasajeros`}
        />
        <DetailRow
          icon={ICON_SHIELD}
          label="SOAT vigente hasta"
          value={vehicle.soatExpiry ? formatDate(vehicle.soatExpiry) : 'No registrado'}
          last
        />
      </Card>
    </View>
  );
});
