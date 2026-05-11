import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, Search } from 'lucide-react-native';
import { Input } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { locationSubtitle } from '@/hooks/usePublishForm';
import { distanceKm, normalizePlace } from '@/lib/utils';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import type { LocationSearchResult } from '@/lib/maps';

interface LocationSearch {
  query: string;
  setQuery: (v: string) => void;
  results: LocationSearchResult[];
  searching: boolean;
}

interface Props {
  target: 'origin' | 'destination';
  search: LocationSearch;
  form: { origin: SelectedLocation | null; destination: SelectedLocation | null; };
  onMapPress: () => void;
  onSuggestionSelect: (item: LocationSearchResult) => void;
}

export function StepLocation({ target, search, form, onMapPress, onSuggestionSelect }: Props) {
  const isOrigin = target === 'origin';
  const location = isOrigin ? form.origin : form.destination;
  const accentColor = isOrigin ? Colors.primary[600] : Colors.accent[600];
  const borderClass = isOrigin
    ? 'border-primary-200 bg-primary-50'
    : 'border-accent-200 bg-accent-50';
  const dotClass = isOrigin ? 'bg-primary-500' : 'bg-accent-500';

  const invalidDestination =
    !isOrigin &&
    !!form.origin &&
    !!form.destination &&
    (normalizePlace(form.origin.name) === normalizePlace(form.destination.name) ||
      distanceKm(form.origin, form.destination) < 1);

  return (
    <>
      <Text className="text-sm font-semibold text-neutral-700 mb-2">
        {isOrigin ? 'Lugar de origen' : 'Lugar de destino'}
      </Text>
      <Input
        placeholder="Escribe ciudad o lugar"
        value={search.query}
        onChangeText={search.setQuery}
        leftIcon={<Search size={18} color={Colors.neutral[400]} />}
      />
      <TouchableOpacity
        onPress={onMapPress}
        className="flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-3 mt-2"
      >
        <View className="flex-row items-center">
          <MapPin size={16} color={accentColor} />
          <Text className="text-sm text-neutral-700 ml-2">Seleccionar desde el mapa</Text>
        </View>
      </TouchableOpacity>

      {search.searching && (
        <Text className="text-xs text-neutral-500 mt-2">Buscando ubicaciones...</Text>
      )}

      {!search.searching && search.results.length > 0 && (
        <View className="mt-2 rounded-xl border border-neutral-200 overflow-hidden bg-white">
          {search.results.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onSuggestionSelect(item)}
              className="px-3 py-3 border-b border-neutral-100"
            >
              <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1" numberOfLines={1}>
                {item.address}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {location && (
        <View
          className={`px-3 py-3 rounded-xl border mt-2 ${invalidDestination ? 'border-red-300 bg-red-50' : borderClass
            }`}
        >
          <View className="flex-row items-center">
            <View
              className={`w-2.5 h-2.5 rounded-full mr-2 ${invalidDestination ? 'bg-red-500' : dotClass
                }`}
            />
            <Text className="text-sm font-medium text-neutral-900 flex-1" numberOfLines={1}>
              {location.name}
            </Text>
          </View>
          {!invalidDestination && locationSubtitle(location) ? (
            <Text className="text-xs text-neutral-500 mt-0.5 ml-4" numberOfLines={1}>
              {locationSubtitle(location)}
            </Text>
          ) : null}
        </View>
      )}

      {invalidDestination && (
        <Text className="text-xs text-red-500 mt-2">
          El destino debe ser diferente al origen.
        </Text>
      )}
    </>
  );
}
