import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Car } from 'lucide-react-native';
import { Screen, Button, Spinner } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { useVehicleDetail } from '@/hooks/useVehicleDetail';
import { VehicleHero } from '@/components/vehicle/VehicleHero';
import { VehicleTitle } from '@/components/vehicle/VehicleTitle';
import { VehicleDetailsCard } from '@/components/vehicle/VehicleDetailsCard';
import { VehicleDocumentsCard } from '@/components/vehicle/VehicleDocumentsCard';
import { VehicleActions } from '@/components/vehicle/VehicleActions';

export default function VehicleDetailScreen() {
  const { vehicle, loading, error, deleting, goBack, handleDelete } = useVehicleDetail();

  if (loading) {
    return <Spinner fullScreen message="Cargando vehículo..." />;
  }

  if (error || !vehicle) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-6">
          <Car size={56} color={Colors.neutral[300]} />
          <Text className="text-lg font-semibold text-neutral-700 mt-4 mb-1">
            No se pudo cargar el vehículo
          </Text>
          <Text className="text-sm text-neutral-400 mb-4 text-center">{error}</Text>
          <Button variant="outline" onPress={goBack}>Volver</Button>
        </View>
      </Screen>
    );
  }

  // safe={false} → hero sangra bajo la status bar (top sin inset).
  // edges={['bottom']} → SafeAreaView aplica padding nativo al bottom,
  // respetando la navigation bar sin necesitar JS-side insets.
  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <View className="flex-1">
        <VehicleHero photoUrls={vehicle.photoUrls} status={vehicle.status} />
        <VehicleTitle brand={vehicle.brand} model={vehicle.model} color={vehicle.color} />
        <VehicleDetailsCard vehicle={vehicle} />
        <VehicleDocumentsCard vehicle={vehicle} />
        <VehicleActions deleting={deleting} onDelete={handleDelete} />
      </View>
    </Screen>
  );
}
