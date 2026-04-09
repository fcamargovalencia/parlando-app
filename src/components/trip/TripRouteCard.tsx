import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Map, ChevronRight } from 'lucide-react-native';
import { Card, Badge } from '@/components/ui';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { Colors } from '@/constants/colors';
import { TRIP_STATUS_BADGE } from '@/constants/trips';
import { getTripTypeLabel } from '@/lib/utils';
import type { TripResponse } from '@/types/api';

interface TripRouteCardProps {
  trip: TripResponse;
  onOpenMap: () => void;
}

export function TripRouteCard({ trip, onOpenMap }: TripRouteCardProps) {
  const pickupWaypoints = (trip.waypoints ?? [])
    .filter((w) => w.isPickupPoint)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <Card>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <TripTypeIcon type={trip.tripType} size={18} />
          <Text className="text-base font-medium text-neutral-600">
            {getTripTypeLabel(trip.tripType)}
          </Text>
        </View>
        <Badge
          label={TRIP_STATUS_BADGE[trip.status].label}
          variant={TRIP_STATUS_BADGE[trip.status].variant}
        />
      </View>

      <View className="gap-1.5">
        {/* Origin */}
        <RoutePoint
          color={Colors.primary[500]}
          name={trip.originName}
          subtitle={trip.originSubtitle}
        />

        {/* Intermediate waypoints */}
        {pickupWaypoints.map((waypoint, idx) => (
          <View key={waypoint.id || idx}>
            <View className="ml-1.5 h-3 w-0.5 bg-neutral-200" />
            <RoutePoint
              color={Colors.primary[400]}
              name={waypoint.name}
              subtitle={waypoint.subtitle}
            />
          </View>
        ))}

        <View className="ml-1.5 h-3 w-0.5 bg-neutral-200" />

        {/* Destination */}
        <RoutePoint
          color={Colors.accent[500]}
          name={trip.destinationName}
          subtitle={trip.destinationSubtitle}
        />
      </View>

      <TouchableOpacity
        onPress={onOpenMap}
        className="flex-row items-center justify-between mt-4 pt-3 border-t border-neutral-100"
      >
        <View className="flex-row items-center gap-2">
          <Map size={16} color={Colors.primary[600]} />
          <Text className="text-base font-medium text-primary-600">
            Ver ruta en el mapa
          </Text>
        </View>
        <ChevronRight size={16} color={Colors.primary[400]} />
      </TouchableOpacity>
    </Card>
  );
}

// ── Helpers ──

function RoutePoint({
  color,
  name,
  subtitle,
}: {
  color: string;
  name: string;
  subtitle?: string | null;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="items-center pt-1">
        <View className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900">{name}</Text>
        {!!subtitle && (
          <Text className="text-sm text-neutral-400 mt-0.5">{subtitle}</Text>
        )}
      </View>
    </View>
  );
}
