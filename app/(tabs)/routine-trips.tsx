import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Route } from 'lucide-react-native';
import { Screen, EmptyState, Spinner, FilterTabs } from '@/components/ui';
import { RoutePreview } from '@/components/RoutePreview';
import { useRoutineTrips } from '@/hooks/useRoutineTrips';
import { Colors } from '@/constants/colors';
import type { RoutineTripResponse, RoutineTripStatus, RecurrenceDay } from '@/types/api';

// ── Types ──

type FilterKey = 'all' | 'active' | 'draft' | 'paused';

const FILTERS: { key: FilterKey; label: string; }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'draft', label: 'Borradores' },
  { key: 'paused', label: 'Pausados' },
];

// ── Helpers ──

const DAY_SHORT: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue',
  FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

function formatDays(days: RecurrenceDay[] = []): string {
  if (!days.length) return '—';
  return days.map((d) => DAY_SHORT[d]).join(' · ');
}

const STATUS_LABELS: Record<RoutineTripStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activa',
  PAUSED: 'Pausada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const STATUS_CHIP_CLASS: Record<RoutineTripStatus, string> = {
  DRAFT: 'bg-neutral-100',
  ACTIVE: 'bg-green-100',
  PAUSED: 'bg-yellow-100',
  COMPLETED: 'bg-blue-100',
  CANCELLED: 'bg-red-100',
};

const STATUS_TEXT_CLASS: Record<RoutineTripStatus, string> = {
  DRAFT: 'text-neutral-600',
  ACTIVE: 'text-green-700',
  PAUSED: 'text-yellow-700',
  COMPLETED: 'text-blue-700',
  CANCELLED: 'text-red-700',
};

// ── Trip card ──

interface RoutineCardProps {
  trip: RoutineTripResponse;
  onPress: () => void;
}

function RoutineCard({ trip, onPress }: RoutineCardProps) {
  const status = trip.status as RoutineTripStatus;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="bg-white rounded-2xl border border-neutral-200 mx-5 mb-3 p-4"
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <RoutePreview
            originName={trip.originName}
            originSubtitle={trip.originSubtitle}
            destinationName={trip.destinationName}
            destinationSubtitle={trip.destinationSubtitle}
            compact
          />
        </View>
        <View className={`px-2.5 py-1 rounded-full ${STATUS_CHIP_CLASS[status]}`}>
          <Text className={`text-xs font-semibold ${STATUS_TEXT_CLASS[status]}`}>
            {STATUS_LABELS[status]}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-4 mt-1">
        <Text className="text-xs text-neutral-500">
          {trip.departureTime} → {trip.requiredArrivalTime}
        </Text>
        <Text className="text-xs text-neutral-500">
          {formatDays(trip.recurrenceDays as RecurrenceDay[])}
        </Text>
        <Text className="text-xs font-medium text-primary-600">
          ${trip.pricePerSeat.toLocaleString('es-CO')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ──

const FILTER_STATUSES: Record<FilterKey, RoutineTripStatus[] | null> = {
  all: null,
  active: ['ACTIVE'],
  draft: ['DRAFT'],
  paused: ['PAUSED'],
};

export default function RoutineTripsScreen() {
  const router = useRouter();
  const { myTrips, isLoading, refetch } = useRoutineTrips();
  const [filter, setFilter] = React.useState<FilterKey>('all');
  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    refetch();
    setRefreshing(false);
  };

  const allowedStatuses = FILTER_STATUSES[filter];
  const filtered = allowedStatuses
    ? myTrips.filter((t) => allowedStatuses.includes(t.status as RoutineTripStatus))
    : myTrips;

  const tabs = FILTERS.map((f) => {
    const statuses = FILTER_STATUSES[f.key];
    const count = statuses
      ? myTrips.filter((t) => statuses.includes(t.status as RoutineTripStatus)).length
      : myTrips.length;
    return { key: f.key, label: f.label, count };
  });

  return (
    <Screen safe={false}>
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-2 border-b border-neutral-100">
        <Text className="text-2xl font-bold text-neutral-900">Mis rutas rutinarias</Text>
        <Text className="text-sm text-neutral-500 mt-0.5">
          Gestiona tus plantillas de viaje recurrente
        </Text>
      </View>

      <FilterTabs tabs={tabs} active={filter} onSelect={setFilter} />

      {isLoading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          estimatedItemSize={130}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <RoutineCard
              trip={item}
              onPress={() => router.push(`/routine/${item.id}` as never)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={filter === 'all' ? 'Sin rutas rutinarias' : 'Sin resultados'}
              description={
                filter === 'all'
                  ? 'Crea tu primera plantilla de ruta recurrente para empezar.'
                  : `No tienes rutas con estado "${FILTERS.find((f) => f.key === filter)?.label}".`
              }
            />
          }
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/routine/create/step-1-route' as never)}
        className="absolute bottom-8 right-5 w-14 h-14 rounded-full bg-primary-500 items-center justify-center shadow-lg"
        activeOpacity={0.85}
        style={{
          shadowColor: Colors.primary[500],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </Screen>
  );
}
