import { useCallback, useReducer } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { tripsApi } from '@/api/trips';
import { bookingsApi } from '@/api/bookings';
import { ratingsApi } from '@/api/ratings';
import { vehiclesApi } from '@/api/vehicles';
import { mapsService } from '@/lib/maps';
import { extractApiError } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { TripResponse, VehicleResponse, BookingResponse, PaymentMethod } from '@/types/api';
import Toast from 'react-native-toast-message';
import { tripDetailReducer, createInitialState } from './reducer';

interface UseTripDetailOptions {
  /**
   * Set to true when navigating from search results. The user is always a
   * passenger in that context, so we skip the getMine() booking check and
   * show the Book button immediately once the trip loads.
   */
  fromSearch?: boolean;
}

export function useTripDetail(id: string, options?: UseTripDetailOptions) {
  const user = useAuthStore((s) => s.user);
  const fromSearch = options?.fromSearch ?? false;

  const [state, dispatch] = useReducer(
    tripDetailReducer,
    fromSearch,
    createInitialState,
  );

  /**
   * Loads secondary (non-critical) data in parallel. The screen is already
   * visible when this runs — any failure here is silent and won't block render.
   */
  const loadSecondary = useCallback(async (t: TripResponse) => {
    const isDriverForTrip = user?.id === t.driverId;

    const vehiclePromise = vehiclesApi.getById(t.vehicleId);
    const tripRatingsPromise = ratingsApi.getByTrip(t.id);
    const driverBookingsPromise = isDriverForTrip
      ? bookingsApi.getByTrip(t.id)
      : null;
    const myBookingsPromise = !isDriverForTrip && !fromSearch
      ? bookingsApi.getMine()
      : null;
    const driverCommentCountPromise = !isDriverForTrip
      ? ratingsApi.getCommentCount(t.driverId)
      : null;

    const [vehicleRes, tripRatingsRes, driverBookingsRes, myBookingsRes, driverCommentRes] =
      await Promise.allSettled([
        vehiclePromise,
        tripRatingsPromise,
        driverBookingsPromise,
        myBookingsPromise,
        driverCommentCountPromise,
      ]);

    if (vehicleRes.status === 'fulfilled' && vehicleRes.value?.data.data) {
      dispatch({ type: 'SET_VEHICLE', vehicle: vehicleRes.value.data.data });
    }

    if (tripRatingsRes.status === 'fulfilled') {
      const myRatings = (tripRatingsRes.value.data.data ?? []).filter(
        (r) => r.reviewerId === user?.id,
      );
      dispatch({
        type: 'SET_RATED_USER_IDS',
        ratedUserIds: new Set(myRatings.map((r) => r.revieweeId)),
      });
    }

    if (isDriverForTrip) {
      if (driverBookingsRes.status === 'fulfilled' && driverBookingsRes.value) {
        const fetchedBookings = driverBookingsRes.value.data.data ?? [];
        dispatch({ type: 'SET_BOOKINGS', bookings: fetchedBookings });

        const uniquePassengerIds = [
          ...new Set(
            fetchedBookings
              .map((b) => b.passenger?.id)
              .filter((pid): pid is string => !!pid),
          ),
        ];
        if (uniquePassengerIds.length > 0) {
          const results = await Promise.allSettled(
            uniquePassengerIds.map((pid) => ratingsApi.getCommentCount(pid)),
          );
          const countsMap: Record<string, number> = {};
          results.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
              countsMap[uniquePassengerIds[idx]] = result.value.data.data ?? 0;
            }
          });
          dispatch({ type: 'SET_PASSENGER_COMMENT_COUNTS', counts: countsMap });
        }
      }
    } else {
      if (myBookingsRes.status === 'fulfilled' && myBookingsRes.value) {
        const existing = (myBookingsRes.value.data.data ?? []).find(
          (b) => b.tripId === t.id,
        );
        dispatch({ type: 'SET_MY_BOOKING', myBooking: existing ?? null });
      } else {
        dispatch({ type: 'SET_MY_BOOKING', myBooking: null });
      }

      if (driverCommentRes.status === 'fulfilled' && driverCommentRes.value) {
        dispatch({ type: 'SET_DRIVER_COMMENT_COUNT', count: driverCommentRes.value.data.data ?? 0 });
      }
    }
  }, [user?.id, fromSearch]);

  const load = useCallback(async () => {
    if (!id) return;
    dispatch({ type: 'LOAD_START' });
    try {
      const { data: res } = await tripsApi.getDetails(id);
      if (!res.data) throw new Error('Viaje no encontrado');
      const t = res.data;
      dispatch({ type: 'LOAD_SUCCESS', trip: t });
      // loadSecondary runs after the screen is already visible — non-blocking
      void loadSecondary(t);
    } catch (err) {
      dispatch({ type: 'LOAD_ERROR', error: extractApiError(err, 'No se pudo cargar el viaje') });
    }
  }, [id, loadSecondary]);

  // useFocusEffect ensures trip data is always fresh when the screen gains focus,
  // including when navigated here from a push notification while already in the stack.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // ── Derived ──

  const { trip, myBooking } = state;
  const isDriver = trip && user ? trip.driverId === user.id : false;
  const canEdit = isDriver && (trip?.status === 'DRAFT' || trip?.status === 'PUBLISHED');
  const canBook =
    !isDriver &&
    trip?.status === 'PUBLISHED' &&
    (trip?.availableSeats ?? 0) > 0 &&
    myBooking === null;

  // ── Action helpers ──

  const runAction = useCallback(async (
    label: string,
    action: () => Promise<void>,
    confirmMsg?: string,
  ) => {
    if (confirmMsg) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(label, confirmMsg, [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirmar', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) return;
    }
    dispatch({ type: 'ACTION_START', label });
    try {
      await action();
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  }, []);

  // ── Trip actions ──

  const handlePublish = useCallback(() =>
    runAction('Publicar', async () => {
      const { data: res } = await tripsApi.publish(id);
      if (res.data) dispatch({ type: 'UPDATE_TRIP', trip: res.data });
      Toast.show({ type: 'success', text1: '¡Viaje publicado!', text2: 'Ya es visible para pasajeros' });
    }), [id, runAction]);

  const handleStart = useCallback(() =>
    runAction(
      'Iniciar viaje',
      async () => {
        const { data: res } = await tripsApi.start(id);
        if (res.data) dispatch({ type: 'UPDATE_TRIP', trip: res.data });
        Toast.show({ type: 'success', text1: 'Viaje iniciado' });
      },
      '¿Confirmas que el viaje está en camino?',
    ), [id, runAction]);

  const handleComplete = useCallback(() =>
    runAction(
      'Completar',
      async () => {
        const { data: res } = await tripsApi.complete(id);
        if (res.data) dispatch({ type: 'UPDATE_TRIP', trip: res.data });
        Toast.show({ type: 'success', text1: 'Viaje completado' });
      },
      '¿Confirmas que llegaste al destino?',
    ), [id, runAction]);

  const handleCancel = useCallback(() =>
    runAction(
      'Cancelar viaje',
      async () => {
        await tripsApi.cancel(id);
        dispatch({ type: 'CANCEL_TRIP' });
        Toast.show({ type: 'success', text1: 'Viaje cancelado' });
      },
      '¿Seguro que quieres cancelar este viaje? Esta acción no se puede deshacer.',
    ), [id, runAction]);

  const handleCancelBooking = useCallback(() => {
    if (!myBooking) return;
    Alert.alert('Cancelar reserva', '¿Seguro que quieres cancelar tu reserva?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          dispatch({ type: 'ACTION_START', label: 'cancel-booking' });
          try {
            await bookingsApi.cancel(myBooking.id);
            dispatch({ type: 'CANCEL_MY_BOOKING' });
            Toast.show({ type: 'success', text1: 'Reserva cancelada' });
          } catch (err) {
            Alert.alert('Error', extractApiError(err, 'No se pudo cancelar'));
          } finally {
            dispatch({ type: 'ACTION_END' });
          }
        },
      },
    ]);
  }, [myBooking]);

  const openMap = useCallback(async () => {
    if (!trip) return;

    const needsWaypoints = state.waypointsFull.length === 0;
    const needsPolyline = state.routePolyline.length === 0;
    if (!needsWaypoints && !needsPolyline) return;

    dispatch({ type: 'MAP_LOAD_START', needsWaypoints, needsPolyline });
    let resolvedWaypoints = state.waypointsFull;

    try {
      if (needsWaypoints) {
        try {
          const { data: res } = await tripsApi.getWaypoints(id);
          const fetched = res.data ?? [];
          if (fetched.length > 0) {
            resolvedWaypoints = fetched;
            dispatch({ type: 'SET_WAYPOINTS', waypoints: fetched });
          } else if (trip.waypoints && trip.waypoints.length > 0) {
            resolvedWaypoints = mapEmbeddedWaypoints(trip);
            dispatch({ type: 'SET_WAYPOINTS', waypoints: resolvedWaypoints });
          }
        } catch {
          if (trip.waypoints && trip.waypoints.length > 0) {
            resolvedWaypoints = mapEmbeddedWaypoints(trip);
            dispatch({ type: 'SET_WAYPOINTS', waypoints: resolvedWaypoints });
          }
        }
      }

      if (needsPolyline) {
        if (trip.routePolyline && trip.routePolyline.length >= 2) {
          dispatch({ type: 'SET_ROUTE_POLYLINE', polyline: trip.routePolyline });
        } else {
          const pickupStops = (resolvedWaypoints.length > 0 ? resolvedWaypoints : mapEmbeddedWaypoints(trip))
            .filter((w) => w.isPickupPoint)
            .sort((a, b) => a.orderIndex - b.orderIndex);

          const stopPoints = [
            { latitude: trip.originLatitude, longitude: trip.originLongitude },
            ...pickupStops.map((w) => ({ latitude: w.latitude, longitude: w.longitude })),
            { latitude: trip.destinationLatitude, longitude: trip.destinationLongitude },
          ];

          try {
            if (mapsService.isConfigured()) {
              const { points } = await mapsService.calculateRoute(stopPoints);
              dispatch({ type: 'SET_ROUTE_POLYLINE', polyline: points.length >= 2 ? points : stopPoints });
            } else {
              dispatch({ type: 'SET_ROUTE_POLYLINE', polyline: stopPoints });
            }
          } catch {
            dispatch({ type: 'SET_ROUTE_POLYLINE', polyline: stopPoints });
          }
        }
      }
    } finally {
      dispatch({ type: 'MAP_LOAD_END', needsWaypoints, needsPolyline });
    }
  }, [id, trip, state.waypointsFull, state.routePolyline]);

  /** Unified rating handler for both driver and passenger. */
  const handleRate = useCallback(async (revieweeId: string, score: number, comment: string) => {
    if (!trip) return;
    await ratingsApi.create({
      revieweeId,
      tripId: trip.id,
      score,
      comment: comment || undefined,
    });
    dispatch({ type: 'ADD_RATED_USER', userId: revieweeId });
    Toast.show({ type: 'success', text1: '¡Calificación enviada!', text2: 'Gracias por tu opinión' });
  }, [trip]);

  const handleBookingAction = useCallback(async (
    bookingId: string,
    action: 'accept' | 'reject' | 'noshow',
  ) => {
    dispatch({ type: 'ACTION_START', label: `${bookingId}-${action}` });
    try {
      const apiCallMap = {
        accept: () => bookingsApi.accept(bookingId),
        reject: () => bookingsApi.reject(bookingId),
        noshow: () => bookingsApi.noShow(bookingId),
      } as const;

      const { data: r } = await apiCallMap[action]();
      const updated = r.data ?? undefined;

      if (updated) {
        dispatch({ type: 'UPDATE_BOOKING', bookingId, booking: updated });
        const { data: tRes } = await tripsApi.getDetails(id);
        if (tRes.data) dispatch({ type: 'UPDATE_TRIP', trip: tRes.data });
      }
      const msgs: Record<string, string> = {
        accept: 'Reserva aceptada',
        reject: 'Reserva rechazada',
        noshow: 'No-show registrado',
      };
      Toast.show({ type: 'success', text1: msgs[action] });
    } catch (err) {
      Alert.alert('Error', extractApiError(err, 'No se pudo completar la acción'));
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  }, [id]);

  const handleBoardPassenger = useCallback(async (
    bookingId: string,
    verificationCode: string,
    paymentMethod: PaymentMethod,
  ) => {
    dispatch({ type: 'ACTION_START', label: `${bookingId}-board` });
    try {
      const { data: r } = await bookingsApi.board(bookingId, { verificationCode, paymentMethod });
      const updated = r.data ?? undefined;
      if (updated) {
        dispatch({ type: 'UPDATE_BOOKING', bookingId, booking: updated });
        const { data: tRes } = await tripsApi.getDetails(id);
        if (tRes.data) dispatch({ type: 'UPDATE_TRIP', trip: tRes.data });
      }
      Toast.show({ type: 'success', text1: 'Abordaje registrado' });
    } catch (err) {
      // Re-throw so the modal can display the error inline
      throw err;
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  }, [id]);

  // ── External update callbacks (used by modal callbacks in the screen) ──

  const updateTrip = useCallback(
    (updatedTrip: TripResponse | null) => dispatch({ type: 'UPDATE_TRIP', trip: updatedTrip }),
    [],
  );

  const updateMyBooking = useCallback(
    (updatedBooking: BookingResponse) => dispatch({ type: 'UPDATE_MY_BOOKING', myBooking: updatedBooking }),
    [],
  );

  return {
    // State
    ...state,
    // Derived
    isDriver,
    canEdit,
    canBook,
    // External update callbacks
    updateTrip,
    updateMyBooking,
    // Actions
    load,
    handlePublish,
    handleStart,
    handleComplete,
    handleCancel,
    handleCancelBooking,
    openMap,
    handleBookingAction,
    handleBoardPassenger,
    handleRate,
  };
}

// ── Helpers ──

function mapEmbeddedWaypoints(trip: TripResponse) {
  return (trip.waypoints ?? []).map((w) => ({
    id: w.id ?? '',
    tripId: trip.id,
    latitude: w.latitude,
    longitude: w.longitude,
    orderIndex: w.orderIndex,
    name: w.name,
    subtitle: w.subtitle,
    isPickupPoint: w.isPickupPoint,
    estimatedArrival: w.estimatedArrival,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  }));
}
