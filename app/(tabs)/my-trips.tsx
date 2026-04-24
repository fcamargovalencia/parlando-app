import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { Route } from 'lucide-react-native';
import { Screen, EmptyState, Spinner, FilterTabs } from '@/components/ui';
import { MyTripCard } from '@/components/trip/MyTripCard';
import { RateModal } from '@/components/trip/RateModal';
import { RoutePreview } from '@/components/RoutePreview';
import { Colors } from '@/constants/colors';
import { useMyTrips } from '@/hooks/useMyTrips';
import { useRoutineTrips } from '@/hooks/useRoutineTrips';
import type { MyTripFilter, MyTripItem } from '@/types/my-trips';
import type { RoutineTripResponse, RoutineTripStatus, RecurrenceDay } from '@/types/api';

// ── Regular trips config ──

const FILTERS: { key: MyTripFilter; label: string; }[] = [
  { key: 'active', label: 'Activos' },
  { key: 'past', label: 'Pasados' },
  { key: 'cancelled', label: 'Cancelados' },
];

const EMPTY_COPY: Record<MyTripFilter, { title: string; description: string; action?: string; }> = {
  active: {
    title: 'Sin viajes activos',
    description: 'Publica un viaje como conductor o reserva uno como pasajero.',
    action: 'Buscar viaje',
  },
  past: {
    title: 'Sin viajes pasados',
    description: 'Aquí aparecerán tus viajes completados como conductor o pasajero.',
  },
  cancelled: {
    title: 'Sin viajes cancelados',
    description: 'Aquí aparecerán los viajes o reservas que hayas cancelado.',
  },
};

// ── Routine trip card helpers ──

const DAY_SHORT: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue',
  FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

function formatDays(days: RecurrenceDay[] = []): string {
  if (!days.length) return '—';
  return days.map((d) => DAY_SHORT[d]).join(' · ');
}

const STATUS_CHIP: Record<RoutineTripStatus, { bg: string; text: string; label: string; }> = {
  DRAFT: { bg: 'bg-neutral-100', text: 'text-neutral-600', label: 'Borrador' },
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Activa' },
  PAUSED: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pausada' },
  COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completada' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
};

const ROUTINE_STATUS_TO_FILTER: Record<RoutineTripStatus, MyTripFilter> = {
  ACTIVE: 'active',
  DRAFT: 'active',
  PAUSED: 'active',
  COMPLETED: 'past',
  CANCELLED: 'cancelled',
};

type UnifiedItem =
  | { kind: 'trip'; data: MyTripItem; }
  | { kind: 'routine'; data: RoutineTripResponse; };

function RoutineCard({ trip, onPress }: { trip: RoutineTripResponse; onPress: (routineId: string) => void; }) {
  const status = trip.status as RoutineTripStatus;
  const chip = STATUS_CHIP[status];
  return (
    <TouchableOpacity
      onPress={() => onPress(trip.id)}
      activeOpacity={0.8}
      className="bg-white rounded-2xl border border-neutral-200 mb-3 p-4"
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
        <View className={`px-2.5 py-1 rounded-full ${chip.bg}`}>
          <Text className={`text-xs font-semibold ${chip.text}`}>{chip.label}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-4">
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

export default function MyTripsScreen() {
  const router = useRouter();

  // Regular trips
  const {
    items,
    counts,
    filter,
    setFilter,
    loading,
    refreshing,
    error,
    cancellingId,
    refresh,
    reload,
    cancelItem,
    rateModal,
    openRateModal,
    closeRateModal,
    submitRating,
  } = useMyTrips();

  // Routine trips
  const { myTrips: routineTrips, isLoading: routineLoading, refetch: refetchRoutine } =
    useRoutineTrips();

  useFocusEffect(
    useCallback(() => {
      void reload(false);
      refetchRoutine();
    }, [reload, refetchRoutine]),
  );

  const onRefresh = useCallback(() => {
    refresh();
    refetchRoutine();
  }, [refresh, refetchRoutine]);

  const handleTripPress = useCallback(
    (tripId: string) => router.push({ pathname: '/trip/[id]', params: { id: tripId } }),
    [router],
  );

  const handleRoutinePress = useCallback(
    (routineId: string) => router.push(`/routine/${routineId}` as never),
    [router],
  );

  // Routine trips filtered to match the active tab
  const filteredRoutine = useMemo(
    () => routineTrips.filter(
      (t) => ROUTINE_STATUS_TO_FILTER[t.status as RoutineTripStatus] === filter,
    ),
    [routineTrips, filter],
  );

  // Combined counts (regular + routine) per tab
  const mergedCounts = useMemo(() => {
    const base = { ...counts };
    routineTrips.forEach((t) => {
      const cat = ROUTINE_STATUS_TO_FILTER[t.status as RoutineTripStatus];
      if (cat) base[cat] += 1;
    });
    return base;
  }, [counts, routineTrips]);

  // Unified list items
  const unifiedItems = useMemo<UnifiedItem[]>(
    () => [
      ...items.map((d): UnifiedItem => ({ kind: 'trip', data: d })),
      ...filteredRoutine.map((d): UnifiedItem => ({ kind: 'routine', data: d })),
    ],
    [items, filteredRoutine],
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-3">
        <Text className="text-3xl font-bold text-neutral-900">Mis viajes</Text>
      </View>

      <FilterTabs
        tabs={FILTERS.map((f) => ({ key: f.key, label: f.label, count: mergedCounts[f.key] }))}
        active={filter}
        onSelect={setFilter}
      />

      {loading || routineLoading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-neutral-500 text-center mb-3">{error}</Text>
          <TouchableOpacity onPress={() => reload()}>
            <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={unifiedItems}
          keyExtractor={(item) =>
            item.kind === 'trip' ? item.data.key : `routine-${item.data.id}`
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Route size={56} color={Colors.neutral[300]} />}
              title={EMPTY_COPY[filter].title}
              description={EMPTY_COPY[filter].description}
              actionLabel={filter === 'active' ? EMPTY_COPY.active.action : undefined}
              onAction={filter === 'active' ? () => router.push('/(tabs)/home') : undefined}
            />
          }
          renderItem={({ item }) => {
            if (item.kind === 'trip') {
              return (
                <MyTripCard
                  item={item.data}
                  cancelling={cancellingId === (item.data.trip?.id ?? item.data.booking?.id)}
                  onPress={handleTripPress}
                  onCancel={cancelItem}
                  onRate={openRateModal}
                />
              );
            }
            return (
              <RoutineCard
                trip={item.data}
                onPress={handleRoutinePress}
              />
            );
          }}
        />
      )}

      <RateModal
        visible={rateModal !== null}
        onClose={closeRateModal}
        onSubmit={submitRating}
        title="Calificar conductor"
        subtitle="Comparte tu experiencia en este viaje"
      />
    </Screen>
  );
}
