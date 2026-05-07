import React from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Car, Plus } from 'lucide-react-native';
import { Screen, EmptyState, Spinner } from '@/components/ui';
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 8 }}
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
          ListFooterComponent={
            vehicles.length > 0 ? (
              <View className="items-end mt-4 mb-2">
                <TouchableOpacity
                  onPress={() => router.push('/vehicle/add')}
                  activeOpacity={0.75}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: Colors.primary[500],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null
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


      </View>
    </Screen>
  );
}
