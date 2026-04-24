import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Car, Check, ChevronRight } from 'lucide-react-native';
import { Screen, Button, Card, Toggle } from '@/components/ui';
import { usePublishRoutineTrip } from '@/hooks/usePublishRoutineTrip';
import { vehiclesApi } from '@/api/vehicles';
import type { VehicleResponse } from '@/types/api';
import { Colors } from '@/constants/colors';

function formatCOP(value: string): string {
  const num = value.replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('es-CO');
}

function parseCOP(formatted: string): number {
  return Number(formatted.replace(/\D/g, '')) || 0;
}

export default function Step3SeatsScreen() {
  const router = useRouter();
  const { formData, updateForm, validateAndProceed, errors } = usePublishRoutineTrip();

  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState(
    formData.pricePerSeat ? String(formData.pricePerSeat) : '',
  );
  const [seatsDisplay, setSeatsDisplay] = useState(
    formData.availableSeats ? String(formData.availableSeats) : '3',
  );

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
  const maxSeats = selectedVehicle?.capacity ?? 8;

  useEffect(() => {
    setLoadingVehicles(true);
    vehiclesApi
      .getMine()
      .then((res) => {
        const active = (res.data.data ?? []).filter((v) => v.status === 'ACTIVE');
        setVehicles(active);
        if (active.length === 1 && !formData.vehicleId) {
          updateForm({ vehicleId: active[0].id, availableSeats: active[0].capacity });
        }
      })
      .catch(() => setVehicles([]))
      .finally(() => setLoadingVehicles(false));
  }, []);

  const handleVehicleSelect = (vehicle: VehicleResponse) => {
    updateForm({ vehicleId: vehicle.id });
    // Cap seats to new vehicle capacity
    const currentSeats = Number(seatsDisplay) || 1;
    if (currentSeats > vehicle.capacity) {
      const capped = String(vehicle.capacity);
      setSeatsDisplay(capped);
      updateForm({ vehicleId: vehicle.id, availableSeats: vehicle.capacity });
    }
  };

  const handleSeatsChange = (text: string) => {
    const num = text.replace(/\D/g, '');
    setSeatsDisplay(num);
    const parsed = Number(num);
    if (parsed >= 1 && parsed <= maxSeats) {
      updateForm({ availableSeats: parsed });
    }
  };

  const handlePriceChange = (text: string) => {
    const num = text.replace(/\D/g, '');
    setPriceDisplay(num ? formatCOP(num) : '');
    updateForm({ pricePerSeat: parseCOP(num) });
  };

  const handleNext = () => {
    if (validateAndProceed(3)) {
      router.push('/routine/create/step-4-pickup-config');
    }
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <Text className="text-2xl font-bold text-neutral-900 mb-1">Cupos y precio</Text>
        <Text className="text-base text-neutral-500 mb-6">
          Selecciona tu vehículo y configura disponibilidad.
        </Text>

        {/* Vehicle selector */}
        <Text className="text-sm font-semibold text-neutral-700 mb-2">Vehículo</Text>
        {loadingVehicles ? (
          <View className="items-center py-6 mb-4">
            <ActivityIndicator color={Colors.primary[500]} />
          </View>
        ) : vehicles.length === 0 ? (
          <TouchableOpacity
            onPress={() => router.push('/vehicle/add')}
            activeOpacity={0.7}
          >
            <Card className="p-4 mb-4 border-dashed border-2 border-neutral-300">
              <View className="flex-row items-center">
                <Car size={20} color={Colors.primary[500]} />
                <Text className="ml-3 text-sm text-neutral-600 flex-1">
                  No tienes vehículos activos.{' '}
                  <Text className="text-primary-600 font-semibold">Registrar vehículo</Text>
                </Text>
                <ChevronRight size={18} color={Colors.neutral[400]} />
              </View>
            </Card>
          </TouchableOpacity>
        ) : (
          <View className="gap-2 mb-4">
            {vehicles.map((v) => {
              const selected = formData.vehicleId === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => handleVehicleSelect(v)}
                  activeOpacity={0.7}
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${selected
                      ? 'border-primary-500 bg-primary-50'
                      : errors.vehicleId
                        ? 'border-red-300'
                        : 'border-neutral-200'
                    }`}
                >
                  <Car size={20} color={selected ? Colors.primary[600] : Colors.neutral[500]} />
                  <View className="ml-3 flex-1">
                    <Text className={`text-base font-semibold ${selected ? 'text-primary-700' : 'text-neutral-900'}`}>
                      {v.brand} {v.model} {v.year}
                    </Text>
                    <Text className="text-sm text-neutral-500">
                      {v.plateNumber} · {v.capacity} asientos · {v.color}
                    </Text>
                  </View>
                  {selected ? (
                    <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {errors.vehicleId ? (
          <Text className="text-red-500 text-xs -mt-2 mb-4">{errors.vehicleId}</Text>
        ) : null}

        {/* Available seats */}
        <Text className="text-sm font-semibold text-neutral-700 mb-2">
          Cupos disponibles{selectedVehicle ? ` (máx. ${maxSeats})` : ''}
        </Text>
        <View
          className={`flex-row items-center border rounded-2xl px-4 py-3 bg-white mb-1 ${errors.availableSeats ? 'border-red-400' : 'border-neutral-200'
            }`}
        >
          <TextInput
            className="flex-1 text-base text-neutral-900"
            value={seatsDisplay}
            onChangeText={handleSeatsChange}
            keyboardType="number-pad"
            maxLength={2}
            placeholderTextColor={Colors.neutral[400]}
            placeholder="3"
          />
          <Text className="text-sm text-neutral-500">cupos</Text>
        </View>
        {errors.availableSeats ? (
          <Text className="text-red-500 text-xs mb-4">{errors.availableSeats}</Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* Price */}
        <Text className="text-sm font-semibold text-neutral-700 mb-2">Precio por cupo</Text>
        <View
          className={`flex-row items-center border rounded-2xl px-4 py-3 bg-white mb-1 ${errors.pricePerSeat ? 'border-red-400' : 'border-neutral-200'
            }`}
        >
          <Text className="text-base text-neutral-500 mr-2">$</Text>
          <TextInput
            className="flex-1 text-base text-neutral-900"
            value={priceDisplay}
            onChangeText={handlePriceChange}
            keyboardType="number-pad"
            placeholderTextColor={Colors.neutral[400]}
            placeholder="0"
          />
          <Text className="text-sm text-neutral-500">COP</Text>
        </View>
        {errors.pricePerSeat ? (
          <Text className="text-red-500 text-xs mb-4">{errors.pricePerSeat}</Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* Luggage toggle */}
        <Card className="p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-neutral-800">Acepta equipaje</Text>
              <Text className="text-xs text-neutral-400 mt-0.5">
                Los pasajeros pueden llevar maletas o bolsos grandes
              </Text>
            </View>
            <Toggle
              value={!!formData.allowsLuggage}
              onPress={() => updateForm({ allowsLuggage: !formData.allowsLuggage })}
            />
          </View>
        </Card>
      </ScrollView>

      <View className="px-5 pb-6 pt-3 border-t border-neutral-100 bg-white">
        <Button onPress={handleNext}>Siguiente</Button>
      </View>
    </Screen>
  );
}
