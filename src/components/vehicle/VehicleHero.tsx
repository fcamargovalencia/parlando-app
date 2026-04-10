import React from 'react';
import { View, Text, Image } from 'react-native';
import { Car } from 'lucide-react-native';
import { Badge } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { getStatusColor } from '@/lib/utils';
import type { VehicleStatus } from '@/types/api';

interface Props {
  photoUrls: string[];
  status: VehicleStatus;
}

export function VehicleHero({ photoUrls, status }: Props) {
  return (
    <View className="h-56 bg-neutral-200">
      {photoUrls.length > 0 ? (
        <Image source={{ uri: photoUrls[0] }} className="w-full h-full" resizeMode="cover" />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Car size={64} color={Colors.neutral[400]} />
          <Text className="text-sm text-neutral-400 mt-2">Sin foto</Text>
        </View>
      )}
      <View className="absolute top-4 right-4">
        <Badge variant={getStatusColor(status)} label={status} />
      </View>
    </View>
  );
}
