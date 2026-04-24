import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { GripVertical, Trash2, MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import type { RoutineWaypointResponse } from '@/types/api';

interface WaypointListItemProps {
  waypoint: RoutineWaypointResponse;
  showDragHandle?: boolean;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
}

export const WaypointListItem = React.memo(function WaypointListItem({
  waypoint,
  showDragHandle = false,
  showDelete = false,
  onDelete,
}: WaypointListItemProps) {
  return (
    <View className="flex-row items-center bg-white rounded-xl border border-neutral-200 px-3 py-3 mb-2">
      {showDragHandle && (
        <View className="mr-2">
          <GripVertical size={18} color={Colors.neutral[400]} />
        </View>
      )}
      <View className="w-7 h-7 rounded-full bg-primary-50 items-center justify-center mr-3">
        <MapPin size={14} color={Colors.primary[500]} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
          {waypoint.name}
        </Text>
        {waypoint.subtitle ? (
          <Text className="text-xs text-neutral-500" numberOfLines={1}>
            {waypoint.subtitle}
          </Text>
        ) : null}
        <Text className="text-xs text-neutral-400 mt-0.5">
          +{waypoint.estimatedMinutesOffset} min ·{' '}
          {waypoint.isPickupPoint ? 'Punto de recogida' : 'Parada intermedia'}
        </Text>
      </View>
      <View
        className={`px-2.5 py-1 rounded-full mr-2 ${waypoint.isPickupPoint ? 'bg-primary-100' : 'bg-neutral-100'
          }`}
      >
        <Text
          className={`text-xs font-medium ${waypoint.isPickupPoint ? 'text-primary-700' : 'text-neutral-500'
            }`}
        >
          {waypoint.isPickupPoint ? 'Recogida' : 'Parada'}
        </Text>
      </View>
      {showDelete && onDelete ? (
        <TouchableOpacity
          onPress={() => onDelete(waypoint.id)}
          className="w-8 h-8 items-center justify-center"
        >
          <Trash2 size={16} color={Colors.semantic.error} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});
