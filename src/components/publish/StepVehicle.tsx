import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Car, ChevronRight, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { PublishAction } from '@/hooks/usePublishForm';
import type { VehicleResponse } from '@/types/api';

function isVehicleActive(status: string | undefined) {
  return (status ?? '').toUpperCase() === 'ACTIVE';
}

interface Props {
  vehicleId: string;
  vehicleOptions: VehicleResponse[];
  loadingVehicles: boolean;
  hasRegisteredVehicles: boolean;
  dispatch: React.Dispatch<PublishAction>;
}

export function StepVehicle({
  vehicleId,
  vehicleOptions,
  loadingVehicles,
  hasRegisteredVehicles,
  dispatch,
}: Props) {
  const router = useRouter();

  return (
    <>
      <Text className="text-sm font-semibold text-neutral-700 mb-2">Selecciona tu vehículo</Text>

      {loadingVehicles ? (
        <View className="items-center py-6 mb-6">
          <ActivityIndicator color={Colors.primary[500]} />
        </View>
      ) : vehicleOptions.length === 0 ? (
        <TouchableOpacity onPress={() => router.push('/vehicle/add')} activeOpacity={0.7}>
          <Card className="mb-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Car size={20} color={Colors.primary[600]} />
                <Text className="text-sm text-neutral-700 ml-3 flex-1">
                  {hasRegisteredVehicles
                    ? 'Tu vehículo está registrado pero aún no está activo para publicar viajes.'
                    : 'No tienes vehículos activos. '}
                  <Text className="text-primary-600 font-semibold">
                    {hasRegisteredVehicles ? 'Ver mis vehículos' : 'Registrar uno'}
                  </Text>
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.neutral[400]} />
            </View>
          </Card>
        </TouchableOpacity>
      ) : (
        <View className="mb-5">
          {vehicleOptions.map((v) => {
            const selected = vehicleId === v.id;
            const active = isVehicleActive(v.status);
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => {
                  if (!active) {
                    Alert.alert('Vehículo no disponible', 'Solo puedes seleccionar vehículos activos.');
                    return;
                  }
                  dispatch({ type: 'SET_VEHICLE', payload: v.id });
                }}
                activeOpacity={0.7}
                className={`flex-row items-center p-3 rounded-2xl border-2 mb-2 ${
                  active ? 'bg-white' : 'bg-neutral-50'
                } ${selected ? 'border-primary-500' : 'border-neutral-200'}`}
              >
                <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-3">
                  <Car size={22} color={Colors.primary[400]} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-900">
                    {v.brand} {v.model} {v.year}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{v.color}</Text>
                  <View
                    className={`rounded px-1.5 py-0.5 self-start mt-1 ${
                      active ? 'bg-primary-50' : 'bg-neutral-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        active ? 'text-primary-700' : 'text-neutral-600'
                      }`}
                    >
                      {v.plateNumber}
                    </Text>
                  </View>
                  <Text className={`text-xs mt-1 ${active ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Estado: {active ? 'Activo' : 'No activo'}
                  </Text>
                </View>
                {selected && (
                  <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
                    <Check size={14} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );
}
