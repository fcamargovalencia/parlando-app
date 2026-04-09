import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, ChevronRight, MapPin, Search } from 'lucide-react-native';
import dayjs from 'dayjs';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { Colors } from '@/constants/colors';
import { TRIP_TYPE_OPTIONS } from '@/constants/trips';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import type { TripType } from '@/types/api';

// ── Location button ──

function LocationButton({
  label,
  value,
  accent,
  onPress,
}: {
  label: string;
  value: SelectedLocation | null;
  accent: boolean;
  onPress: () => void;
}) {
  const dotColor = accent ? Colors.accent[500] : Colors.primary[500];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="flex-row items-center bg-neutral-50 rounded-2xl px-3 py-4"
      style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
    >
      <View
        className="w-8 h-8 rounded-full items-center justify-center"
        style={{ backgroundColor: accent ? Colors.accent[50] : Colors.primary[50] }}
      >
        <MapPin size={16} color={dotColor} />
      </View>
      <View className="flex-1 ml-2.5">
        {value ? (
          <>
            <Text className="text-xs font-medium" style={{ color: Colors.neutral[400] }}>
              {label}
            </Text>
            <Text className="text-sm font-semibold text-neutral-900 mt-0.5" numberOfLines={1}>
              {value.name}
            </Text>
          </>
        ) : (
          <Text className="text-base text-neutral-400">{label}</Text>
        )}
      </View>
      <ChevronRight size={16} color={Colors.neutral[300]} />
    </TouchableOpacity>
  );
}

// ── Props ──

interface SearchCardProps {
  origin: SelectedLocation | null;
  destination: SelectedLocation | null;
  departureDate: Date;
  tripType: TripType;
  canSearch: boolean;
  onOpenOriginPicker: () => void;
  onOpenDestPicker: () => void;
  onOpenDatePicker: () => void;
  onOpenTripTypeSheet: () => void;
  onSearch: () => void;
}

// ── Card ──

export function SearchCard({
  origin,
  destination,
  departureDate,
  tripType,
  canSearch,
  onOpenOriginPicker,
  onOpenDestPicker,
  onOpenDatePicker,
  onOpenTripTypeSheet,
  onSearch,
}: SearchCardProps) {
  const dateLabel = dayjs(departureDate).isSame(dayjs(), 'day')
    ? 'Hoy'
    : dayjs(departureDate).isSame(dayjs().add(1, 'day'), 'day')
      ? 'Mañana'
      : dayjs(departureDate).format('D MMM');

  const tripTypeLabel = TRIP_TYPE_OPTIONS.find((t) => t.type === tripType)?.label;

  return (
    <View
      className="bg-white rounded-3xl p-5"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      <Text className="text-base font-bold text-neutral-900 mb-4">¿A dónde vas?</Text>

      {/* Route inputs with decoration */}
      <View className="gap-2 mb-3">
        <View className="flex-row">
          <View className="items-center mr-3 pt-5 pb-5" style={{ width: 20 }}>
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.primary[500] }} />
            <View
              className="flex-1 w-0.5 my-1"
              style={{ backgroundColor: Colors.neutral[200], minHeight: 18 }}
            />
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.accent[500] }} />
          </View>
          <View className="flex-1 gap-2">
            <LocationButton
              label="¿Desde dónde sales?"
              value={origin}
              accent={false}
              onPress={onOpenOriginPicker}
            />
            <LocationButton
              label="¿A dónde vas?"
              value={destination}
              accent={true}
              onPress={onOpenDestPicker}
            />
          </View>
        </View>
      </View>

      {/* Date & trip type */}
      <View className="flex-row gap-2 mb-4">
        <TouchableOpacity
          onPress={onOpenDatePicker}
          activeOpacity={0.75}
          className="flex-1 flex-row items-center bg-neutral-50 rounded-2xl px-3 py-3.5"
          style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
        >
          <Calendar size={16} color={Colors.primary[500]} />
          <View className="ml-2 flex-1">
            <Text className="text-xs font-medium" style={{ color: Colors.neutral[400] }}>
              Fecha
            </Text>
            <Text className="text-sm font-semibold text-neutral-900">{dateLabel}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onOpenTripTypeSheet}
          activeOpacity={0.75}
          className="flex-1 flex-row items-center bg-neutral-50 rounded-2xl px-3 py-3.5"
          style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
        >
          <TripTypeIcon type={tripType} />
          <View className="ml-2 flex-1">
            <Text className="text-xs font-medium" style={{ color: Colors.neutral[400] }}>
              Tipo
            </Text>
            <Text className="text-sm font-semibold text-neutral-900">{tripTypeLabel}</Text>
          </View>
          <ChevronRight size={14} color={Colors.neutral[300]} />
        </TouchableOpacity>
      </View>

      {/* Search button */}
      <TouchableOpacity
        onPress={onSearch}
        activeOpacity={canSearch ? 0.8 : 1}
        className="rounded-2xl py-4 flex-row items-center justify-center"
        style={{ backgroundColor: canSearch ? Colors.primary[600] : Colors.neutral[200] }}
      >
        <Search size={18} color={canSearch ? '#FFF' : Colors.neutral[400]} />
        <Text
          className="font-bold ml-2 text-base"
          style={{ color: canSearch ? '#FFF' : Colors.neutral[400] }}
        >
          Buscar viaje
        </Text>
      </TouchableOpacity>
    </View>
  );
}
