import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Car, Calendar, Fuel } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import type { VehicleResponse } from '@/types/api';
import { formatDate } from '@/lib/utils';

interface VehicleCardProps {
  vehicle: VehicleResponse;
  onPress?: () => void;
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
    ACTIVE: { label: 'Activo', variant: 'success' },
    INACTIVE: { label: 'Inactivo', variant: 'neutral' },
    PENDING_VERIFICATION: { label: 'En revisión', variant: 'warning' },
    REJECTED: { label: 'Rechazado', variant: 'error' },
  };
  return map[status] ?? { label: status, variant: 'neutral' };
}

export function VehicleCard({ vehicle, onPress }: VehicleCardProps) {
  const statusBadge = getStatusBadge(vehicle.status);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card className="mb-3">
        <View className="flex-row">
          {vehicle.photoUrls?.[0] ? (
            <Image
              source={{ uri: vehicle.photoUrls[0] }}
              className="w-20 h-20 rounded-xl mr-3"
              resizeMode="cover"
            />
          ) : (
            <View className="w-20 h-20 rounded-xl bg-primary-50 items-center justify-center mr-3">
              <Car size={32} color={Colors.primary[400]} />
            </View>
          )}
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-neutral-900">
                {vehicle.brand} {vehicle.model}
              </Text>
              <Badge label={statusBadge.label} variant={statusBadge.variant} />
            </View>
            <Text className="text-sm text-neutral-500 mt-0.5">
              {vehicle.color} · {vehicle.year} · {vehicle.capacity} asientos
            </Text>
            <View className="flex-row items-center mt-2">
              <View className="bg-primary-50 px-2 py-0.5 rounded-md">
                <Text className="text-xs font-bold text-primary-700">
                  {vehicle.plateNumber}
                </Text>
              </View>
            </View>
            {vehicle.soatExpiry && (
              <View className="flex-row items-center mt-1.5">
                <Calendar size={12} color={Colors.neutral[400]} />
                <Text className="text-xs text-neutral-400 ml-1">
                  SOAT vence: {formatDate(vehicle.soatExpiry)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
