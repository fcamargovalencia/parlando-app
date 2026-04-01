import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Route, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import { Screen, EmptyState, Badge } from '@/components/ui';
import { Colors } from '@/constants/colors';

type TripFilter = 'upcoming' | 'completed' | 'cancelled';

const filterItems: { key: TripFilter; label: string; }[] = [
  { key: 'upcoming', label: 'Próximos' },
  { key: 'completed', label: 'Completados' },
  { key: 'cancelled', label: 'Cancelados' },
];

export default function MyTripsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<TripFilter>('upcoming');

  return (
    <Screen>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold text-neutral-900">Mis viajes</Text>
        <Text className="text-sm text-neutral-500 mt-1">
          Tu historial de viajes y reservas
        </Text>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-6 mt-3 mb-4">
        {filterItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => setActiveFilter(item.key)}
            className={`mr-2 px-4 py-2 rounded-full ${activeFilter === item.key
                ? 'bg-primary-500'
                : 'bg-neutral-100'
              }`}
          >
            <Text
              className={`text-sm font-medium ${activeFilter === item.key ? 'text-white' : 'text-neutral-600'
                }`}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Empty State - TODO: Replace with real trip data when API is available */}
      <EmptyState
        icon={<Route size={56} color={Colors.neutral[300]} />}
        title="Sin viajes aún"
        description="Cuando busques o publiques un viaje aparecerá aquí. ¡Empieza explorando rutas disponibles!"
        actionLabel="Buscar viajes"
        onAction={() => router.push('/(tabs)/home')}
      />
    </Screen>
  );
}
