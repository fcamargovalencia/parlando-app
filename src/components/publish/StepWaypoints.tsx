import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Plus, ChevronUp, ChevronDown, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { locationSubtitle } from '@/hooks/usePublishForm';
import type { SelectedLocation } from '@/components/LocationPickerModal';

interface Props {
  form: { origin: SelectedLocation | null; destination: SelectedLocation | null };
  waypoints: SelectedLocation[];
  onAddWaypoint: () => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onRemove: (idx: number) => void;
}

export function StepWaypoints({
  form,
  waypoints,
  onAddWaypoint,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) {
  return (
    <>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-neutral-700">Ciudades intermedias</Text>
        <TouchableOpacity onPress={onAddWaypoint} className="flex-row items-center">
          <Plus size={16} color={Colors.primary[600]} />
          <Text className="text-xs font-semibold text-primary-600 ml-1">Agregar</Text>
        </TouchableOpacity>
      </View>

      {/* Origin anchor */}
      <View className="flex-row items-start px-3 py-2.5 rounded-xl border border-primary-200 bg-primary-50 mb-2">
        <View className="w-2.5 h-2.5 rounded-full bg-primary-500 mr-2 mt-1" />
        <View className="flex-1">
          <Text className="text-[10px] text-primary-600 font-medium">ORIGEN</Text>
          <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>
            {form.origin?.name}
          </Text>
          {form.origin && locationSubtitle(form.origin) ? (
            <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
              {locationSubtitle(form.origin)}
            </Text>
          ) : null}
        </View>
      </View>

      {waypoints.length === 0 ? (
        <View className="items-center py-4 mb-2">
          <Text className="text-sm text-neutral-400 text-center">
            No hay paradas. Puedes continuar sin ciudades intermedias.
          </Text>
        </View>
      ) : (
        <View className="gap-2 mb-2">
          {waypoints.map((w, idx) => (
            <View
              key={`${w.latitude}-${w.longitude}-${idx}`}
              className="flex-row items-center rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
            >
              <View className="flex-1 mr-2">
                <Text className="text-[10px] text-neutral-400 font-medium">PARADA {idx + 1}</Text>
                <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>
                  {w.name}
                </Text>
                {locationSubtitle(w) ? (
                  <Text className="text-xs text-neutral-400 mt-0.5" numberOfLines={1}>
                    {locationSubtitle(w)}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row items-center gap-1">
                <TouchableOpacity
                  onPress={() => onMoveUp(idx)}
                  disabled={idx === 0}
                  className={`w-7 h-7 rounded-lg border items-center justify-center ${
                    idx === 0 ? 'border-neutral-100 opacity-30' : 'border-neutral-200'
                  }`}
                >
                  <ChevronUp size={14} color={Colors.neutral[600]} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onMoveDown(idx)}
                  disabled={idx === waypoints.length - 1}
                  className={`w-7 h-7 rounded-lg border items-center justify-center ${
                    idx === waypoints.length - 1
                      ? 'border-neutral-100 opacity-30'
                      : 'border-neutral-200'
                  }`}
                >
                  <ChevronDown size={14} color={Colors.neutral[600]} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onRemove(idx)}
                  className="w-7 h-7 rounded-lg border border-neutral-200 items-center justify-center"
                >
                  <X size={14} color={Colors.neutral[500]} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Destination anchor */}
      <View className="flex-row items-start px-3 py-2.5 rounded-xl border border-accent-200 bg-accent-50">
        <View className="w-2.5 h-2.5 rounded-full bg-accent-500 mr-2 mt-1" />
        <View className="flex-1">
          <Text className="text-[10px] text-accent-600 font-medium">DESTINO</Text>
          <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>
            {form.destination?.name}
          </Text>
          {form.destination && locationSubtitle(form.destination) ? (
            <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
              {locationSubtitle(form.destination)}
            </Text>
          ) : null}
        </View>
      </View>
    </>
  );
}
