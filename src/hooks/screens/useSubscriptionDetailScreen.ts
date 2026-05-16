import { useCallback, useReducer, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { routineSubscriptionsApi } from '@/api/routine-subscriptions';
import { useMySubscriptions } from '@/hooks/useMySubscriptions';
import { useRoutineSubscriptionsStore } from '@/stores/routine-subscriptions-store';
import {
  subscriptionDetailReducer,
  initialSubscriptionDetailState,
} from '@/reducers/subscription-detail.reducer';
import type {
  RoutineSubscriptionResponse,
  RoutineBookingResponse,
  PickupOverrideRequest,
} from '@/types/api';

function dateToISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseISO(s: string): Date {
  const [y, m, day] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function useSubscriptionDetailScreen(id: string | undefined) {
  const router = useRouter();
  const { pauseSubscription, resumeSubscription, cancelSubscription, overridePickup } =
    useMySubscriptions();

  const [uiState, dispatch] = useReducer(
    subscriptionDetailReducer,
    initialSubscriptionDetailState,
  );
  const subscription = useRoutineSubscriptionsStore(
    useCallback((s) => s.mySubscriptions.find((sub) => sub.id === id) ?? null, [id]),
  );
  const fetchMine = useRoutineSubscriptionsStore((s) => s.fetchMine);
  const [bookings, setBookings] = useState<RoutineBookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(() => subscription === null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // subscription updates reactively from the store; mutations (pause/resume) already
  // call updateInMine so no explicit reload is needed.
  const reloadSubscription = useCallback(async () => { }, []);

  // useFocusEffect ensures subscription data is always fresh when the screen gains
  // focus — including when navigated here from a push notification.
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let cancelled = false;
      (async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
          const inStore = useRoutineSubscriptionsStore.getState().mySubscriptions.some((s) => s.id === id);
          const [, bookingsRes] = await Promise.all([
            inStore ? Promise.resolve() : fetchMine(),
            routineSubscriptionsApi.getBookings(id),
          ]);
          if (!cancelled) {
            const found = useRoutineSubscriptionsStore.getState().mySubscriptions.some((s) => s.id === id);
            if (!found) setLoadError('Suscripción no encontrada');
            const sorted = (bookingsRes.data.data ?? []).sort((a, b) =>
              a.occurrenceDate.localeCompare(b.occurrenceDate),
            );
            setBookings(sorted);
            setIsLoading(false);
          }
        } catch (err: unknown) {
          const anyErr = err as { response?: { data?: { message?: string; }; }; message?: string; };
          const msg =
            anyErr?.response?.data?.message ?? anyErr?.message ?? 'Error al cargar la suscripción';
          if (!cancelled) {
            setLoadError(msg);
            setIsLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id, fetchMine]),
  );

  const handlePause = useCallback(async () => {
    if (!id || !uiState.pauseFrom) return;
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      await pauseSubscription(
        id,
        uiState.pauseFrom,
        uiState.hasPauseTo ? uiState.pauseTo : undefined,
        uiState.pauseReason || undefined,
      );
      await reloadSubscription();
      dispatch({ type: 'CLOSE_MODAL' });
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string; }; }; };
      Alert.alert('Error', anyErr?.response?.data?.message ?? 'Error al pausar');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [
    id,
    uiState.pauseFrom,
    uiState.pauseTo,
    uiState.pauseReason,
    uiState.hasPauseTo,
    pauseSubscription,
    reloadSubscription,
  ]);

  const handleResume = useCallback(async () => {
    if (!id) return;
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      await resumeSubscription(id);
      await reloadSubscription();
      dispatch({ type: 'CLOSE_MODAL' });
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string; }; }; };
      Alert.alert('Error', anyErr?.response?.data?.message ?? 'Error al reactivar');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [id, resumeSubscription, reloadSubscription]);

  const doCancel = useCallback(async () => {
    if (!id) return;
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      await cancelSubscription(id);
      dispatch({ type: 'CLOSE_MODAL' });
      router.back();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string; }; }; };
      Alert.alert('Error', anyErr?.response?.data?.message ?? 'Error al cancelar');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [id, cancelSubscription, router]);

  const handleCancel = useCallback(() => {
    const upcoming = bookings.find((b) => b.status === 'ACCEPTED');
    if (upcoming) {
      const diffH =
        (parseISO(upcoming.occurrenceDate).getTime() - Date.now()) / (1000 * 60 * 60);
      if (diffH > 0 && diffH < 24) {
        Alert.alert(
          '⚠️ Penalización posible',
          'Faltan menos de 24h para tu próximo viaje. Cancelar ahora puede afectar tu calificación.',
          [
            { text: 'Volver', style: 'cancel' },
            { text: 'Cancelar de todas formas', style: 'destructive', onPress: doCancel },
          ],
        );
        return;
      }
    }
    doCancel();
  }, [bookings, doCancel]);

  const handleOverridePickup = useCallback(async () => {
    const { selectedBooking, overrideLat, overrideLng, overrideName } = uiState;
    if (!selectedBooking) return;
    const lat = parseFloat(overrideLat);
    const lng = parseFloat(overrideLng);
    if (isNaN(lat) || isNaN(lng) || !overrideName.trim()) {
      Alert.alert('Error', 'Completa todos los campos del punto de recogida');
      return;
    }
    const diffH =
      (parseISO(selectedBooking.occurrenceDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (diffH < 2) {
      Alert.alert(
        'No disponible',
        'Solo puedes cambiar el punto con al menos 2 horas de anticipación.',
      );
      return;
    }
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      const req: PickupOverrideRequest = {
        latitude: lat,
        longitude: lng,
        name: overrideName.trim(),
      };
      await overridePickup(selectedBooking.id, req);
      Alert.alert('¡Cambio enviado!', 'El conductor recibirá la solicitud y responderá pronto.');
      dispatch({ type: 'CLOSE_MODAL' });
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string; }; }; };
      Alert.alert('Error', anyErr?.response?.data?.message ?? 'Error al enviar el cambio');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [uiState, overridePickup]);

  const openPauseModal = useCallback(() => {
    dispatch({ type: 'OPEN_PAUSE_MODAL', payload: { pauseFrom: dateToISO(new Date()) } });
  }, []);

  const openResumeModal = useCallback(() => dispatch({ type: 'OPEN_RESUME_MODAL' }), []);
  const openCancelModal = useCallback(() => dispatch({ type: 'OPEN_CANCEL_MODAL' }), []);
  const closeModal = useCallback(() => dispatch({ type: 'CLOSE_MODAL' }), []);

  const openBookingDetail = useCallback((booking: RoutineBookingResponse) => {
    router.push(`/trip/${booking.tripId}`);
  }, [router]);

  return {
    uiState,
    dispatch,
    subscription,
    bookings,
    isLoading,
    loadError,
    handlers: {
      handlePause,
      handleResume,
      handleCancel,
      handleOverridePickup,
      openPauseModal,
      openResumeModal,
      openCancelModal,
      openBookingDetail,
      closeModal,
    },
  };
}
