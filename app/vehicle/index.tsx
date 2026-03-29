import React from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Car, Plus } from 'lucide-react-native';
import { Screen, Button, EmptyState, Spinner } from '@/components/ui';
import { VehicleCard } from '@/components/VehicleCard';
import { useVehicles } from '@/hooks/useVehicles';
import { Colors } from '@/constants/colors';

export default function VehiclesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { vehicles, loading, fetchVehicles } = useVehicles();

  if (loading && vehicles.length === 0) {
    return <Spinner fullScreen message="Cargando vehículos..." />;
  }

  return (
    <Screen safe={false}>
      <View className="flex-1">
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <VehicleCard
              vehicle={item}
              onPress={() => router.push(`/vehicle/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchVehicles}
              tintColor={Colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Car size={56} color={Colors.neutral[300]} />}
              title="Sin vehículos registrados"
              description="Registra tu vehículo para empezar a publicar viajes como conductor."
              actionLabel="Registrar vehículo"
              onAction={() => router.push('/vehicle/add')}
            />
          }
        />

        {vehicles.length > 0 && (
          <View style={{ position: 'absolute', bottom: Math.max(insets.bottom, 16) + 8, right: 24 }}>
            <Button
              onPress={() => router.push('/vehicle/add')}
              size="lg"
              className="rounded-full px-5"
              icon={<Plus size={20} color="#FFF" />}
            >
              Agregar
            </Button>
          </View>
        )}
      </View>
    </Screen>
  );
}
