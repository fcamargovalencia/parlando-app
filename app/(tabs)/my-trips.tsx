import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Banknote,
  ChevronRight,
  Clock,
  Info,
  Pause,
  Pencil,
  Play,
  Repeat,
  Route,
} from 'lucide-react-native';
import { Screen, EmptyState, Spinner, FilterTabs } from '@/components/ui';
import { MyTripCard } from '@/components/trip/MyTripCard';
import { RateModal } from '@/components/trip/RateModal';
import { RoutePreview } from '@/components/RoutePreview';
import { Colors } from '@/constants/colors';
import { useMyTrips } from '@/hooks/useMyTrips';
import { useRoutineTrips } from '@/hooks/useRoutineTrips';
import { formatCurrency } from '@/lib/utils';
import type { MyTripFilter } from '@/types/my-trips';
import type { RoutineTripResponse, RoutineTripStatus, RecurrenceDay } from '@/types/api';

// ── Segmented control ──

type Segment = 'unique' | 'routine';

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

// ── Routine trips config ──

type RoutineFilterKey = 'active' | 'draft' | 'paused';

const ROUTINE_FILTERS: { key: RoutineFilterKey; label: string; }[] = [
  { key: 'active', label: 'Activas' },
  { key: 'draft', label: 'Borradores' },
  { key: 'paused', label: 'Pausadas' },
];

const ROUTINE_FILTER_STATUSES: Record<RoutineFilterKey, RoutineTripStatus[] | null> = {
  active: ['ACTIVE'],
  draft: ['DRAFT'],
  paused: ['PAUSED'],
};

const DAY_SHORT: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue',
  FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

const ALL_DAYS: RecurrenceDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const DAY_TO_NUM: Record<RecurrenceDay, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

const MONTH_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function computeNextTrip(days: RecurrenceDay[], departureTime: string): string | null {
  if (!days.length) return null;
  const now = new Date();
  const parts = departureTime.split(':');
  const hour = parseInt(parts[0] ?? '0', 10);
  const minute = parseInt(parts[1] ?? '0', 10);
  const numDays = days.map((d) => DAY_TO_NUM[d]);

  for (let i = 0; i <= 7; i++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    candidate.setHours(hour, minute, 0, 0);
    if (numDays.includes(candidate.getDay()) && candidate > now) {
      const dayKey = days.find((d) => DAY_TO_NUM[d] === candidate.getDay());
      const dayName = dayKey ? DAY_SHORT[dayKey] : '';
      const month = MONTH_ES[candidate.getMonth()];
      return `${dayName} ${candidate.getDate()} ${month} · ${departureTime}`;
    }
  }
  return null;
}

const STATUS_ACCENT: Record<RoutineTripStatus, string> = {
  DRAFT: Colors.neutral[300],
  ACTIVE: Colors.primary[500],
  PAUSED: '#F59E0B',
  COMPLETED: Colors.neutral[300],
  CANCELLED: Colors.neutral[300],
};

const STATUS_CHIP: Record<RoutineTripStatus, { bg: string; text: string; label: string; }> = {
  DRAFT: { bg: 'bg-neutral-100', text: 'text-neutral-600', label: 'Borrador' },
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Activa' },
  PAUSED: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pausada' },
  COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completada' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
};

interface RoutineCardProps {
  trip: RoutineTripResponse;
  actioning: boolean;
  onPress: () => void;
  onEdit: () => void;
  onPause: () => void;
  onResume: () => void;
  onViewTrips: () => void;
}

function RoutineCard({ trip, actioning, onPress, onEdit, onPause, onResume, onViewTrips }: RoutineCardProps) {
  const status = trip.status as RoutineTripStatus;
  const chip = STATUS_CHIP[status];
  const accentColor = STATUS_ACCENT[status];
  const activeDaySet = useMemo(
    () => new Set(trip.recurrenceDays as RecurrenceDay[]),
    [trip.recurrenceDays],
  );
  const nextTrip = useMemo(
    () => computeNextTrip(trip.recurrenceDays as RecurrenceDay[], trip.departureTime),
    [trip.recurrenceDays, trip.departureTime],
  );
  const isReadOnly = status === 'COMPLETED' || status === 'CANCELLED';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.neutral[100],
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}>
        {/* Accent bar + content */}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 4, backgroundColor: accentColor }} />

          <View style={{ flex: 1, padding: 14 }}>
            {/* Top row: icon + badge + actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 26, height: 26, borderRadius: 8,
                  backgroundColor: status === 'ACTIVE' ? Colors.primary[50] : '#FEF3C7',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Repeat size={13} color={status === 'ACTIVE' ? Colors.primary[500] : '#F59E0B'} />
                </View>
                <View className={`px-2.5 py-0.5 rounded-full ${chip.bg}`}>
                  <Text className={`text-xs font-semibold ${chip.text}`}>{chip.label}</Text>
                </View>
              </View>

              {!isReadOnly && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); onEdit(); }}
                    style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Pencil size={13} color={Colors.neutral[600]} />
                  </TouchableOpacity>

                  {(status === 'ACTIVE' || status === 'PAUSED') && (
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation?.(); status === 'ACTIVE' ? onPause() : onResume(); }}
                      disabled={actioning}
                      style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' }}
                    >
                      {actioning
                        ? <ActivityIndicator size={12} color={Colors.neutral[600]} />
                        : status === 'ACTIVE'
                          ? <Pause size={13} color={Colors.neutral[600]} />
                          : <Play size={13} color={Colors.neutral[600]} />
                      }
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Route */}
            <RoutePreview
              originName={trip.originName}
              originSubtitle={trip.originSubtitle}
              destinationName={trip.destinationName}
              destinationSubtitle={trip.destinationSubtitle}
              compact
            />

            {/* Day pills */}
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
              {ALL_DAYS.map((day) => {
                const isActive = activeDaySet.has(day);
                return (
                  <View key={day} style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: isActive ? Colors.primary[500] : Colors.neutral[100],
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: isActive ? '#fff' : Colors.neutral[400] }}>
                      {DAY_SHORT[day].slice(0, 2)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Time + price */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color={Colors.neutral[400]} />
                <Text style={{ fontSize: 12, color: Colors.neutral[500] }}>
                  {trip.departureTime} → {trip.requiredArrivalTime}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Banknote size={12} color={Colors.neutral[400]} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.neutral[900] }}>
                  {formatCurrency(trip.pricePerSeat, trip.currency)}
                  <Text style={{ fontWeight: '400', color: Colors.neutral[500] }}> / asiento</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer: próximo viaje (ACTIVE) */}
        {status === 'ACTIVE' && (
          <View style={{
            borderTopWidth: 1,
            borderTopColor: Colors.neutral[100],
            backgroundColor: Colors.primary[50],
          }}>
            {nextTrip && (
              <View style={{ paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: Colors.primary[700] }}>
                    Próximo viaje
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.primary[700] }}>
                    {nextTrip}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); onViewTrips(); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.primary[500] }}>
                    Ver viajes
                  </Text>
                  <ChevronRight size={14} color={Colors.primary[500]} />
                </TouchableOpacity>
              </View>
            )}
            {!nextTrip && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); onViewTrips(); }}
                style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.primary[500] }}>Ver viajes</Text>
                <ChevronRight size={14} color={Colors.primary[500]} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Footer: pausada */}
        {status === 'PAUSED' && (
          <View style={{
            borderTopWidth: 1,
            borderTopColor: Colors.neutral[100],
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: '#FEF3C7',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Info size={14} color='#F59E0B' />
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#92400E', flex: 1 }}>
              Ruta pausada — no genera viajes nuevos
            </Text>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); onViewTrips(); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E' }}>Ver viajes</Text>
              <ChevronRight size={14} color='#92400E' />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ──

export default function MyTripsScreen() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('unique');
  const [routineFilter, setRoutineFilter] = useState<RoutineFilterKey>('active');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const {
    items: allItems,
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

  // Exclude routine-generated trips from unique trips tab
  const items = useMemo(
    () => allItems.filter((i) => !i.trip?.isRecurring && i.trip?.tripType !== 'ROUTINE'),
    [allItems],
  );

  const { myTrips: routineTrips, isLoading: routineLoading, refetch: refetchRoutine, pauseTrip, resumeTrip } =
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

  const handleRoutineEdit = useCallback(
    (routineId: string) => router.push(`/routine/create/step-1-route?tripId=${routineId}` as never),
    [router],
  );

  const handleViewTrips = useCallback(
    (routineId: string) => router.push(`/routine/${routineId}/occurrences` as never),
    [router],
  );

  const handlePause = useCallback(
    (routineId: string) => {
      Alert.alert(
        '¿Pausar la ruta?',
        'Las ocurrencias futuras sin reservas activas serán canceladas.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Pausar',
            style: 'destructive',
            onPress: async () => {
              setActioningId(routineId);
              try {
                await pauseTrip(routineId);
              } catch {
                Alert.alert('Error', 'No se pudo pausar la ruta');
              } finally {
                setActioningId(null);
              }
            },
          },
        ],
      );
    },
    [pauseTrip],
  );

  const handleResume = useCallback(
    (routineId: string) => {
      Alert.alert('¿Reactivar la ruta?', 'La ruta volverá a estar activa y visible.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reactivar',
          onPress: async () => {
            setActioningId(routineId);
            try {
              await resumeTrip(routineId);
            } catch {
              Alert.alert('Error', 'No se pudo reactivar la ruta');
            } finally {
              setActioningId(null);
            }
          },
        },
      ]);
    },
    [resumeTrip],
  );

  const filteredRoutine = useMemo(() => {
    const statuses = ROUTINE_FILTER_STATUSES[routineFilter];
    return statuses
      ? routineTrips.filter((t) => statuses.includes(t.status as RoutineTripStatus))
      : routineTrips;
  }, [routineTrips, routineFilter]);

  const routineTabs = useMemo(
    () => ROUTINE_FILTERS.map((f) => {
      const statuses = ROUTINE_FILTER_STATUSES[f.key];
      const count = statuses
        ? routineTrips.filter((t) => statuses.includes(t.status as RoutineTripStatus)).length
        : routineTrips.length;
      return { key: f.key, label: f.label, count };
    }),
    [routineTrips],
  );

  const isUniqueSegment = segment === 'unique';

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-0">
        <Text className="text-[26px] font-bold text-neutral-900 mb-2.5">Mis viajes</Text>
        <SegmentedControl active={segment} onChange={setSegment} />
      </View>

      {/* ── Unique trips ── */}
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

      {/* ── Routine trips ── */}
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
                      ? () => router.push('/routine/create/step-1-route' as never)
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
