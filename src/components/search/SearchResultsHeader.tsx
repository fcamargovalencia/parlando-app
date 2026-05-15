import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, Clock, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { Colors, Shadows } from '@/constants/colors';

interface SearchResultsHeaderProps {
  originName: string;
  originCity?: string;
  originState?: string;
  destName: string;
  destCity?: string;
  destState?: string;
  departureFrom: string;
  radiusKm: number;
  tripsCount: number | null; // null while loading
  onBack: () => void;
}

function formatDateLabel(iso: string): string {
  const d = dayjs(iso);
  const today = dayjs();
  if (d.isSame(today, 'day')) return 'Hoy';
  if (d.isSame(today.add(1, 'day'), 'day')) return 'Mañana';
  return d.format('D MMM');
}

export function SearchResultsHeader({
  originName,
  originCity,
  originState,
  destName,
  destCity,
  destState,
  departureFrom,
  radiusKm,
  tripsCount,
  onBack,
}: SearchResultsHeaderProps) {
  const insets = useSafeAreaInsets();
  const dateLabel = formatDateLabel(departureFrom);

  return (
    <View
      className="bg-white border-b border-neutral-100"
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        ...Shadows.sm,
      }}
    >
      {/* Back + route */}
      <View className="flex-row items-center gap-3 mb-3">
        <TouchableOpacity
          onPress={onBack}
          className="w-9 h-9 items-center justify-center rounded-full bg-neutral-100"
        >
          <ArrowLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: Colors.primary[500] }}
            />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                {originName}
              </Text>
              {(originCity || originState) && (
                <Text className="text-xs" style={{ color: Colors.neutral[400] }} numberOfLines={1}>
                  {[originCity, originState].filter(Boolean).join(', ')}
                </Text>
              )}
            </View>
          </View>
          <View className="flex-row items-center gap-1.5 mt-1">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: Colors.accent[500] }}
            />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                {destName}
              </Text>
              {(destCity || destState) && (
                <Text className="text-xs" style={{ color: Colors.neutral[400] }} numberOfLines={1}>
                  {[destCity, destState].filter(Boolean).join(', ')}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Meta chips */}
      <View className="flex-row items-center gap-2 ml-12">
        <View className="flex-row items-center gap-1 bg-neutral-100 rounded-full px-3 py-1">
          <Clock size={12} color={Colors.neutral[500]} />
          <Text className="text-xs font-medium text-neutral-600">{dateLabel}</Text>
        </View>
        <View className="flex-row items-center gap-1 bg-neutral-100 rounded-full px-3 py-1">
          <MapPin size={12} color={Colors.neutral[500]} />
          <Text className="text-xs font-medium text-neutral-600">Radio {radiusKm} km</Text>
        </View>
        {tripsCount !== null && (
          <View className="flex-row items-center gap-1 bg-primary-50 rounded-full px-3 py-1">
            <Text className="text-xs font-semibold text-primary-700">{tripsCount} viajes</Text>
          </View>
        )}
      </View>
    </View>
  );
}
