import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { Route, CalendarRange, Plus } from 'lucide-react-native';
import { Screen, EmptyState, Spinner, FilterTabs } from '@/components/ui';
import { MyTripCard } from '@/components/trip/MyTripCard';
import { RateModal } from '@/components/trip/RateModal';
import { RoutePreview } from '@/components/RoutePreview';
import { Colors } from '@/constants/colors';
import { useMyTrips } from '@/hooks/useMyTrips';
import { useRoutineTrips } from '@/hooks/useRoutineTrips';
import type { MyTripFilter } from '@/types/my-trips';
import type { RoutineTripResponse, RoutineTripStatus, RecurrenceDay } from '@/types/api';

// ── Mode toggle ──

type ScreenMode = 'trips' | 'routines';

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

type RoutineFilterKey = 'all' | 'active' | 'draft' | 'paused';

const ROUTINE_FILTERS: { key: RoutineFilterKey; label: string; }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas' },
  { key: 'draft', label: 'Borradores' },
  { key: 'paused', label: 'Pausadas' },
];

const ROUTINE_FILTER_STATUSES: Record<RoutineFilterKey, RoutineTripStatus[] | null> = {
  all: null,
  active: ['ACTIVE'],
  draft: ['DRAFT'],
  paused: ['PAUSED'],
};

function RoutineCard({ trip, onPress }: { trip: RoutineTripResponse; onPress: () => void; }) {
  const status = trip.status as RoutineTripStatus;
  const chip = STATUS_CHIP[status];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="bg-white rounded-2xl border border-neutral-200 mx-4 mb-3 p-4"
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
  const [mode, setMode] = useState<ScreenMode>('trips');
  const [routineFilter, setRoutineFilter] = useState<RoutineFilterKey>('all');
  const [routineRefreshing, setRoutineRefreshing] = useState(false);

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

  const onRoutineRefresh = async () => {
    setRoutineRefreshing(true);
    refetchRoutine();
    setRoutineRefreshing(false);
  };

  const allowedStatuses = ROUTINE_FILTER_STATUSES[routineFilter];
  const filteredRoutine = allowedStatuses
    ? routineTrips.filter((t) => allowedStatuses.includes(t.status as RoutineTripStatus))
    : routineTrips;

  const routineFilterTabs = ROUTINE_FILTERS.map((f) => {
    const statuses = ROUTINE_FILTER_STATUSES[f.key];
    const count = statuses
      ? routineTrips.filter((t) => statuses.includes(t.status as RoutineTripStatus)).length
      : routineTrips.length;
    return { key: f.key, label: f.label, count };
  });

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-3">
        <Text className="text-3xl font-bold text-neutral-900">Mis viajes</Text>
        {/* Mode toggle */}
        <View className="flex-row bg-neutral-100 rounded-xl p-1 mt-3">
          <TouchableOpacity
            onPress={() => setMode('trips')}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${mode === 'trips' ? 'bg-white shadow-sm' : ''
              }`}
          >
            <Route size={14} color={mode === 'trips' ? Colors.primary[600] : Colors.neutral[500]} />
            <Text
              className={`text-sm font-semibold ${mode === 'trips' ? 'text-primary-700' : 'text-neutral-500'
                }`}
            >
              Puntuales
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('routines')}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${mode === 'routines' ? 'bg-white shadow-sm' : ''
              }`}
          >
            <CalendarRange
              size={14}
              color={mode === 'routines' ? Colors.primary[600] : Colors.neutral[500]}
            />
            <Text
              className={`text-sm font-semibold ${mode === 'routines' ? 'text-primary-700' : 'text-neutral-500'
                }`}
            >
              Rutinarios
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── REGULAR TRIPS ── */}
      {mode === 'trips' && (
        <>
          <FilterTabs
            tabs={FILTERS.map((f) => ({ key: f.key, label: f.label, count: counts[f.key] }))}
            active={filter}
            onSelect={setFilter}
          />
          {loading ? (
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
              data={items}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
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
              renderItem={({ item }) => (
                <MyTripCard
                  item={item}
                  cancelling={cancellingId === (item.trip?.id ?? item.booking?.id)}
                  onPress={() =>
                    router.push({ pathname: '/trip/[id]', params: { id: item.tripId } })
                  }
                  onCancel={() => cancelItem(item)}
                  onRate={() => openRateModal(item)}
                />
              )}
            />
          )}
          <RateModal
            visible={rateModal !== null}
            onClose={closeRateModal}
            onSubmit={submitRating}
            title="Calificar conductor"
            subtitle="Comparte tu experiencia en este viaje"
          />
        </>
      )}

      {/* ── ROUTINE TRIPS ── */}
      {mode === 'routines' && (
        <>
          <FilterTabs
            tabs={routineFilterTabs}
            active={routineFilter}
            onSelect={setRoutineFilter}
          />
          {routineLoading && !routineRefreshing ? (
            <View className="flex-1 items-center justify-center">
              <Spinner />
            </View>
          ) : (
            <FlashList
              data={filteredRoutine}
              keyExtractor={(item) => item.id}
              estimatedItemSize={130}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={routineRefreshing}
                  onRefresh={onRoutineRefresh}
                  tintColor={Colors.primary[500]}
                />
              }
              ListEmptyComponent={
                <EmptyState
                  icon={<CalendarRange size={56} color={Colors.neutral[300]} />}
                  title={
                    routineFilter === 'all'
                      ? 'Sin rutas rutinarias'
                      : `Sin rutas ${ROUTINE_FILTERS.find((f) => f.key === routineFilter)?.label.toLowerCase()}`
                  }
                  description={
                    routineFilter === 'all'
                      ? 'Crea tu primera plantilla de ruta recurrente desde Publicar.'
                      : undefined
                  }
                  actionLabel={routineFilter === 'all' ? 'Crear ruta rutinaria' : undefined}
                  onAction={
                    routineFilter === 'all'
                      ? () => router.push('/routine/create/step-1-route' as never)
                      : undefined
                  }
                />
              }
              renderItem={({ item }) => (
                <RoutineCard
                  trip={item}
                  onPress={() => router.push(`/routine/${item.id}` as never)}
                />
              )}
            />
          )}
          {/* FAB */}
          <TouchableOpacity
            onPress={() => router.push('/routine/create/step-1-route' as never)}
            className="absolute bottom-8 right-5 w-14 h-14 rounded-full bg-primary-500 items-center justify-center"
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
        </>
      )}
    </Screen>
  );
}
