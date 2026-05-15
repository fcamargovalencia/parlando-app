import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMyTrips } from '@/hooks/useMyTrips';
import { useRoutineTrips } from '@/hooks/useRoutineTrips';
import { useRoutineSubscriptionsStore } from '@/stores/routine-subscriptions-store';
import type { RoutineSubscriptionResponse, RoutineTripStatus, SubscriptionStatus } from '@/types/api';
import type { RoutineListItem } from '@/types/my-trips';

export type Segment = 'unique' | 'routine';
export type RoutineFilterKey = 'active' | 'pending' | 'paused';

const ROUTINE_TEMPLATE_STATUSES: Record<RoutineFilterKey, RoutineTripStatus[]> = {
  active: ['ACTIVE'],
  pending: ['DRAFT'],
  paused: ['PAUSED'],
};

const ROUTINE_SUBSCRIPTION_STATUSES: Record<RoutineFilterKey, SubscriptionStatus[]> = {
  active: ['ACCEPTED'],
  pending: ['PENDING'],
  paused: ['PAUSED'],
};

export const ROUTINE_FILTERS: { key: RoutineFilterKey; label: string; }[] = [
  { key: 'active', label: 'Activos' },
  { key: 'pending', label: 'En espera' },
  { key: 'paused', label: 'Pausados' },
];

export function useMyTripsScreen() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('unique');
  const [routineFilter, setRoutineFilter] = useState<RoutineFilterKey>('active');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const {
    allItems,
    items: categoryItems,
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
    () => categoryItems.filter((i) => i.tripType !== 'ROUTINE'),
    [categoryItems],
  );

  const uniqueCounts = useMemo(
    () => allItems
      .filter((i) => i.tripType !== 'ROUTINE')
      .reduce(
        (acc, item) => { acc[item.category] += 1; return acc; },
        { active: 0, past: 0, cancelled: 0 } as Record<import('@/types/my-trips').MyTripFilter, number>,
      ),
    [allItems],
  );

  const { myTrips: routineTrips, isLoading: routineLoading, refetch: refetchRoutine, pauseTrip, resumeTrip } =
    useRoutineTrips();

  const mySubscriptions = useRoutineSubscriptionsStore((s) => s.mySubscriptions);
  const fetchMySubscriptions = useRoutineSubscriptionsStore((s) => s.fetchMine);

  useFocusEffect(
    useCallback(() => {
      void reload(false);
      refetchRoutine();
      void fetchMySubscriptions();
    }, [reload, refetchRoutine, fetchMySubscriptions]),
  );

  const onRefresh = useCallback(() => {
    refresh();
    refetchRoutine();
    void fetchMySubscriptions();
  }, [refresh, refetchRoutine, fetchMySubscriptions]);

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

  const handleSubscriptionPress = useCallback(
    (subscriptionId: string) => router.push(`/subscription/${subscriptionId}` as never),
    [router],
  );

  const routineItems = useMemo((): RoutineListItem[] => {
    const templates: RoutineListItem[] = routineTrips.map((t) => ({ type: 'template', id: t.id, data: t }));
    const subscriptions: RoutineListItem[] = mySubscriptions.map((s: RoutineSubscriptionResponse) => ({
      type: 'subscription',
      id: s.id,
      data: s,
    }));
    return [...templates, ...subscriptions];
  }, [routineTrips, mySubscriptions]);

  const filteredRoutine = useMemo((): RoutineListItem[] => {
    const templateStatuses = ROUTINE_TEMPLATE_STATUSES[routineFilter];
    const subscriptionStatuses = ROUTINE_SUBSCRIPTION_STATUSES[routineFilter];
    return routineItems.filter((item) =>
      item.type === 'template'
        ? templateStatuses.includes(item.data.status as RoutineTripStatus)
        : subscriptionStatuses.includes((item.data as RoutineSubscriptionResponse).status),
    );
  }, [routineItems, routineFilter]);

  const routineTabs = useMemo(
    () => ROUTINE_FILTERS.map((f) => {
      const templateStatuses = ROUTINE_TEMPLATE_STATUSES[f.key];
      const subscriptionStatuses = ROUTINE_SUBSCRIPTION_STATUSES[f.key];
      const count = routineItems.filter((item) =>
        item.type === 'template'
          ? templateStatuses.includes(item.data.status as RoutineTripStatus)
          : subscriptionStatuses.includes((item.data as RoutineSubscriptionResponse).status),
      ).length;
      return { key: f.key, label: f.label, count };
    }),
    [routineItems],
  );

  return {
    segment,
    setSegment,
    items,
    counts: uniqueCounts,
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
    handleSubscriptionPress,
  };
}
