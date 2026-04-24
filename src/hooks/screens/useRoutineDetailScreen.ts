import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useRoutineTrips } from '@/hooks/useRoutineTrips';
import { useRoutineWaypoints } from '@/hooks/useRoutineWaypoints';
import { useRoutineTripsStore } from '@/stores/routine-trips-store';

export function useRoutineDetailScreen(id: string | undefined) {
  const router = useRouter();
  const selectedTrip = useRoutineTripsStore((s) => s.selectedRoutineTrip);
  const fetchById = useRoutineTripsStore((s) => s.fetchById);
  const storeLoading = useRoutineTripsStore((s) => s.isLoading);

  const { waypoints, fetchWaypoints } = useRoutineWaypoints();
  const { pauseTrip, resumeTrip, cancelTrip, publishTrip } = useRoutineTrips();

  const [isActioning, setIsActioning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    await Promise.all([fetchById(id), fetchWaypoints(id)]);
  }, [id, fetchById, fetchWaypoints]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const goToList = useCallback(
    () => router.replace('/(tabs)/my-trips' as never),
    [router],
  );

  const handlePublish = useCallback(() => {
    if (!id) return;
    Alert.alert(
      'Publicar ruta',
      '¿Publicar esta plantilla? Los pasajeros podrán encontrarla y suscribirse.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Publicar',
          onPress: async () => {
            setIsActioning(true);
            try {
              await publishTrip(id);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo publicar');
            } finally {
              setIsActioning(false);
            }
          },
        },
      ],
    );
  }, [id, publishTrip]);

  const handlePause = useCallback(() => {
    if (!id) return;
    Alert.alert(
      '¿Pausar la ruta?',
      'Las ocurrencias futuras sin bookings activos serán canceladas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pausar',
          style: 'destructive',
          onPress: async () => {
            setIsActioning(true);
            try {
              await pauseTrip(id);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo pausar');
            } finally {
              setIsActioning(false);
            }
          },
        },
      ],
    );
  }, [id, pauseTrip]);

  const handleResume = useCallback(() => {
    if (!id) return;
    Alert.alert('¿Reactivar la ruta?', 'La ruta volverá a estar activa y visible.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reactivar',
        onPress: async () => {
          setIsActioning(true);
          try {
            await resumeTrip(id);
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo reactivar');
          } finally {
            setIsActioning(false);
          }
        },
      },
    ]);
  }, [id, resumeTrip]);

  const handleCancel = useCallback(() => {
    if (!id) return;
    Alert.alert(
      'Cancelar plantilla',
      'Esto cancelará todas las ocurrencias futuras y notificará a todos tus suscriptores. Esta acción es irreversible.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Cancelar ruta',
          style: 'destructive',
          onPress: async () => {
            setIsActioning(true);
            try {
              await cancelTrip(id);
              router.replace('/(tabs)/my-trips' as never);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cancelar');
              setIsActioning(false);
            }
          },
        },
      ],
    );
  }, [id, cancelTrip, router]);

  return {
    selectedTrip,
    waypoints,
    storeLoading,
    isActioning,
    refreshing,
    handlers: {
      onRefresh,
      goToList,
      handlePublish,
      handlePause,
      handleResume,
      handleCancel,
    },
  };
}
