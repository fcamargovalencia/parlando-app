import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Repeat, Route } from 'lucide-react-native';
import { Screen, EmptyState, Spinner, FilterTabs } from '@/components/ui';
import { MyTripCard } from '@/components/trip/MyTripCard';
import { RateModal } from '@/components/trip/RateModal';
import { RoutineCard } from '@/components/routine/RoutineCard';
import { Colors } from '@/constants/colors';
import {
  useMyTripsScreen,
  ROUTINE_FILTERS,
  type Segment,
} from '@/hooks/screens/useMyTripsScreen';
import type { MyTripFilter } from '@/types/my-trips';

// ── Segmented control ──

function SegmentedControl({ active, onChange }: { active: Segment; onChange: (s: Segment) => void; }) {
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] }}>
      {(['unique', 'routine'] as Segment[]).map((seg) => {
        const isActive = active === seg;
        return (
          <TouchableOpacity
            key={seg}
            onPress={() => onChange(seg)}
            activeOpacity={0.7}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderBottomWidth: 2.5,
              borderBottomColor: isActive ? Colors.primary[500] : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: isActive ? '700' : '500',
              color: isActive ? Colors.primary[500] : Colors.neutral[500],
            }}>
              {seg === 'unique' ? 'Viajes únicos' : 'Viajes rutinarios'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Unique trips config ──

const TRIP_FILTERS: { key: MyTripFilter; label: string; }[] = [
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

// ── Screen ──

export default function MyTripsScreen() {
  const router = useRouter();
  const {
    segment, setSegment,
    items, counts, filter, setFilter, loading, refreshing, error, cancellingId,
    reload, cancelItem, rateModal, openRateModal, closeRateModal, submitRating,
    routineFilter, setRoutineFilter, routineLoading, filteredRoutine, routineTabs,
    actioningId, onRefresh,
    handleTripPress, handleRoutinePress, handleRoutineEdit, handleViewTrips,
    handlePause, handleResume,
  } = useMyTripsScreen();

  const isUniqueSegment = segment === 'unique';

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View className="px-5 pt-4 pb-0">
        <Text className="text-[26px] font-bold text-neutral-900 mb-2.5">Mis viajes</Text>
        <SegmentedControl active={segment} onChange={setSegment} />
      </View>

      {isUniqueSegment && (
        <>
          <FilterTabs
            tabs={TRIP_FILTERS.map((f) => ({ key: f.key, label: f.label, count: counts[f.key] }))}
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
              renderItem={({ item }) => (
                <MyTripCard
                  item={item}
                  cancelling={cancellingId === (item.trip?.id ?? item.booking?.id)}
                  onPress={handleTripPress}
                  onCancel={cancelItem}
                  onRate={openRateModal}
                />
              )}
            />
          )}
        </>
      )}

      {!isUniqueSegment && (
        <>
          <FilterTabs tabs={routineTabs} active={routineFilter} onSelect={setRoutineFilter} />
          {routineLoading ? (
            <View className="flex-1 items-center justify-center">
              <Spinner />
            </View>
          ) : (
            <FlashList
              data={filteredRoutine}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
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
                  icon={<Repeat size={56} color={Colors.neutral[300]} />}
                  title={routineFilter === 'active' ? 'Sin rutas rutinarias' : 'Sin resultados'}
                  description={
                    routineFilter === 'active'
                      ? 'Crea tu primera plantilla de ruta recurrente para empezar.'
                      : `No tienes rutas con estado "${ROUTINE_FILTERS.find((f) => f.key === routineFilter)?.label}".`
                  }
                  actionLabel={routineFilter === 'active' ? 'Crear ruta rutinaria' : undefined}
                  onAction={
                    routineFilter === 'active'
                      ? () => router.push('/routine/create/step-1-route')
                      : undefined
                  }
                />
              }
              renderItem={({ item }) => (
                <RoutineCard
                  trip={item}
                  actioning={actioningId === item.id}
                  onPress={() => handleRoutinePress(item.id)}
                  onEdit={() => handleRoutineEdit(item.id)}
                  onPause={() => handlePause(item.id)}
                  onResume={() => handleResume(item.id)}
                  onViewTrips={() => handleViewTrips(item.id)}
                />
              )}
            />
          )}
        </>
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
