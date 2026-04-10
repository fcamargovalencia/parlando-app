import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Car } from 'lucide-react-native';
import { Screen, Button, Spinner } from '@/components/ui';
import { useVehicles } from '@/hooks/useVehicles';
import { Colors } from '@/constants/colors';
import { VehicleHero } from '@/components/vehicle/VehicleHero';
import { VehicleTitle } from '@/components/vehicle/VehicleTitle';
import { VehicleDetailsCard } from '@/components/vehicle/VehicleDetailsCard';
import { VehicleDocumentsCard } from '@/components/vehicle/VehicleDocumentsCard';
import { VehicleActions } from '@/components/vehicle/VehicleActions';
import Toast from 'react-native-toast-message';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selected: vehicle, loading, error, fetchVehicle, deleteVehicle } = useVehicles();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) fetchVehicle(id);
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      'Eliminar vehículo',
      `¿Estás seguro de que deseas eliminar ${vehicle?.brand} ${vehicle?.model}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const success = await deleteVehicle(id!);
            setDeleting(false);
            if (success) {
              Toast.show({ type: 'success', text1: 'Vehículo eliminado' });
              router.back();
            }
          },
        },
      ],
    );
  };

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
          <Button variant="outline" onPress={() => router.back()}>
            Volver
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen safe={false}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        <VehicleHero photoUrls={vehicle.photoUrls} status={vehicle.status} />
        <VehicleTitle brand={vehicle.brand} model={vehicle.model} color={vehicle.color} />
        <VehicleDetailsCard vehicle={vehicle} />
        <VehicleDocumentsCard vehicle={vehicle} />
        <VehicleActions deleting={deleting} onDelete={handleDelete} />
      </ScrollView>
    </Screen>
  );
}
