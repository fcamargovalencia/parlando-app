import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMyTrips } from '@/hooks/useMyTrips';
import { useRoutineTrips } from '@/hooks/useRoutineTrips';
import type { RoutineTripStatus } from '@/types/api';

export type Segment = 'unique' | 'routine';
export type RoutineFilterKey = 'active' | 'draft' | 'paused';

const ROUTINE_FILTER_STATUSES: Record<RoutineFilterKey, RoutineTripStatus[]> = {
  active: ['ACTIVE'],
  draft: ['DRAFT'],
  paused: ['PAUSED'],
};

export const ROUTINE_FILTERS: { key: RoutineFilterKey; label: string; }[] = [
  { key: 'active', label: 'Activas' },
  { key: 'draft', label: 'Borradores' },
  { key: 'paused', label: 'Pausadas' },
];

export function useMyTripsScreen() {
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
    return routineTrips.filter((t) => statuses.includes(t.status as RoutineTripStatus));
  }, [routineTrips, routineFilter]);

  const routineTabs = useMemo(
    () => ROUTINE_FILTERS.map((f) => {
      const statuses = ROUTINE_FILTER_STATUSES[f.key];
      const count = routineTrips.filter((t) => statuses.includes(t.status as RoutineTripStatus)).length;
      return { key: f.key, label: f.label, count };
    }),
    [routineTrips],
  );

  return {
    segment,
    setSegment,
    items,
    counts,
    filter,
    setFilter,
    loading,
    refreshing,
    error,
    cancellingId,
    reload,
    cancelItem,
    rateModal,
    openRateModal,
    closeRateModal,
    submitRating,
    routineFilter,
    setRoutineFilter,
    routineLoading,
    filteredRoutine,
    routineTabs,
    actioningId,
    onRefresh,
    handleTripPress,
    handleRoutinePress,
    handleRoutineEdit,
    handleViewTrips,
    handlePause,
    handleResume,
  };
}
