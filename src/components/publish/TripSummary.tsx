import React from 'react';
import { View, Text } from 'react-native';
import {
  Bus,
  Map,
  Calendar,
  Users,
  DollarSign,
  Car,
  Luggage,
  GraduationCap,
} from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { locationSubtitle } from '@/hooks/usePublishForm';
import { formatDuration } from '@/lib/utils';
import type { PublishForm } from '@/hooks/usePublishForm';
import type { RouteAlternative } from '@/hooks/useRouteAlternatives';
import type { VehicleResponse, TripType } from '@/types/api';

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function routeModeLabel(routeMode: string) {
  if (routeMode === 'DIRECT') return 'Ruta directa';
  if (routeMode === 'FLEXIBLE') return 'Ruta flexible';
  return 'Con paradas';
}

interface Props {
  form: PublishForm;
  tripType: TripType;
  tripTypeLabel: string;
  selectedRoute: RouteAlternative | null | undefined;
  routeMode: string;
  selectedVehicle: VehicleResponse | null;
}

export const TripSummary = React.memo(function TripSummary({
  form,
  tripType,
  tripTypeLabel,
  selectedRoute,
  routeMode,
  selectedVehicle,
}: Props) {
  return (
    <>
      <Text className="text-lg font-bold text-neutral-900 mb-3">Resumen del viaje</Text>
      <View style={{ gap: 5 }}>
        <Card className="bg-primary-50 border border-primary-100">
          <View className="flex-row items-center">
            <Bus size={20} color={Colors.primary[700]} />
            <View className="ml-3">
              <Text className="text-xs text-neutral-500">Tipo y ruta</Text>
              <Text className="text-base font-semibold text-neutral-900">
                {tripTypeLabel} · {routeModeLabel(routeMode)}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row gap-3">
            <View className="flex-1 flex-row items-start">
              <Map size={18} color={Colors.neutral[700]} className="mt-0.5" />
              <View className="ml-2 flex-1">
                <Text className="text-xs text-neutral-500">Origen</Text>
                <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
                  {form.origin?.name ?? 'Sin definir'}
                </Text>
                {form.origin && locationSubtitle(form.origin) ? (
                  <Text className="text-xs text-neutral-400 mt-0.5" numberOfLines={1}>
                    {locationSubtitle(form.origin)}
                  </Text>
                ) : null}
              </View>
            </View>
            <View className="flex-1 flex-row items-start">
              <Map size={18} color={Colors.accent[600]} className="mt-0.5" />
              <View className="ml-2 flex-1">
                <Text className="text-xs text-neutral-500">Destino</Text>
                <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
                  {form.destination?.name ?? 'Sin definir'}
                </Text>
                {form.destination && locationSubtitle(form.destination) ? (
                  <Text className="text-xs text-neutral-400 mt-0.5" numberOfLines={1}>
                    {locationSubtitle(form.destination)}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row">
            <View className="flex-1">
              <Text className="text-xs text-neutral-500">Distancia</Text>
              <Text className="text-lg font-bold text-neutral-900">
                {selectedRoute ? `${selectedRoute.distanceKm.toFixed(1)} km` : '-'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-neutral-500">Tiempo estimado</Text>
              <Text className="text-lg font-bold text-neutral-900">
                {selectedRoute ? formatDuration(selectedRoute.durationMin) : '-'}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row items-center">
            <Calendar size={20} color={Colors.neutral[700]} />
            <View className="ml-3">
              <Text className="text-xs text-neutral-500">Salida</Text>
              <Text className="text-base font-semibold text-neutral-900">
                {fmtDate(form.departureAt)} · {fmtTime(form.departureAt)}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row">
            <View className="flex-row items-center flex-1">
              <Users size={18} color={Colors.neutral[700]} />
              <View className="ml-2">
                <Text className="text-xs text-neutral-500">Asientos</Text>
                <Text className="text-base font-semibold text-neutral-900">
                  {form.availableSeats || '0'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center flex-1">
              <DollarSign size={18} color={Colors.neutral[700]} />
              <View className="ml-2">
                <Text className="text-xs text-neutral-500">Precio</Text>
                <Text className="text-base font-semibold text-neutral-900">
                  COP ${form.pricePerSeat || '0'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row items-center">
            <Car size={20} color={Colors.neutral[700]} />
            <View className="ml-3 flex-1">
              <Text className="text-xs text-neutral-500">Vehículo</Text>
              <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
                {selectedVehicle
                  ? `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plateNumber})`
                  : 'Sin seleccionar'}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Luggage size={18} color={Colors.neutral[700]} />
              <Text className="text-sm text-neutral-700 ml-2">Equipaje</Text>
            </View>
            <Text className="text-sm font-semibold text-neutral-900">
              {form.allowsLuggage ? 'Permitido' : 'No permitido'}
            </Text>
          </View>
          {tripType === 'ROUTINE' && (
            <View className="flex-row items-center justify-between mt-3">
              <View className="flex-row items-center">
                <GraduationCap size={18} color={Colors.neutral[700]} />
                <Text className="text-sm text-neutral-700 ml-2">Solo estudiantes</Text>
              </View>
              <Text className="text-sm font-semibold text-neutral-900">
                {form.studentsOnly ? 'Sí' : 'No'}
              </Text>
            </View>
          )}
        </Card>
      </View>
    </>
  );
});
