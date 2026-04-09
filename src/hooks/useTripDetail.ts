import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { tripsApi } from '@/api/trips';
import { bookingsApi } from '@/api/bookings';
import { ratingsApi } from '@/api/ratings';
import { vehiclesApi } from '@/api/vehicles';
import { tomtomService } from '@/lib/tomtom';
import { useAuthStore } from '@/stores/auth-store';
import type {
  TripResponse,
  VehicleResponse,
  BookingResponse,
  RouteWaypointResponse,
} from '@/types/api';
import Toast from 'react-native-toast-message';

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

  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  // When coming from search we know there's no existing booking yet, so
  // initialise to null to make canBook true immediately after the trip loads.
  const [myBooking, setMyBooking] = useState<BookingResponse | null | undefined>(
    fromSearch ? null : undefined,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Ratings
  const [ratedUserIds, setRatedUserIds] = useState<Set<string>>(new Set());
  const [driverCommentCount, setDriverCommentCount] = useState<number | null>(null);
  const [passengerCommentCounts, setPassengerCommentCounts] = useState<Record<string, number>>({});

  // Route map
  const [waypointsFull, setWaypointsFull] = useState<RouteWaypointResponse[]>([]);
  const [loadingWaypoints, setLoadingWaypoints] = useState(false);
  const [routePolyline, setRoutePolyline] = useState<Array<{ latitude: number; longitude: number; }>>([]);
  const [loadingRoutePolyline, setLoadingRoutePolyline] = useState(false);

  /**
   * Loads secondary (non-critical) data in parallel. The screen is already
   * visible when this runs — any failure here is silent and won't block render.
   */
  const loadSecondary = useCallback(async (t: TripResponse) => {
    const isDriverForTrip = user?.id === t.driverId;

    // Kick off every independent request in parallel.
    const vehiclePromise = vehiclesApi.getById(t.vehicleId);
    const tripRatingsPromise = ratingsApi.getByTrip(t.id);
    const driverBookingsPromise = isDriverForTrip
      ? bookingsApi.getByTrip(t.id)
      : null;
    // Skip getMine() when we know the user is a passenger arriving from search —
    // myBooking is already null and there's no booking to look up.
    const myBookingsPromise = !isDriverForTrip && !fromSearch
      ? bookingsApi.getMine()
      : null;
    const driverCommentCountPromise = !isDriverForTrip
      ? ratingsApi.getCommentCount(t.driverId)
      : null;

    const [
      vehicleRes,
      tripRatingsRes,
      driverBookingsRes,
      myBookingsRes,
      driverCommentRes,
    ] = await Promise.allSettled([
      vehiclePromise,
      tripRatingsPromise,
      driverBookingsPromise,
      myBookingsPromise,
      driverCommentCountPromise,
    ]);

    // Vehicle
    if (vehicleRes.status === 'fulfilled' && vehicleRes.value?.data.data) {
      setVehicle(vehicleRes.value.data.data);
    }

    // Ratings I've given on this trip
    if (tripRatingsRes.status === 'fulfilled') {
      const myRatings = (tripRatingsRes.value.data.data ?? []).filter(
        (r) => r.reviewerId === user?.id,
      );
      setRatedUserIds(new Set(myRatings.map((r) => r.revieweeId)));
    }

    if (isDriverForTrip) {
      // Driver: bookings for this trip + passenger comment counts
      if (driverBookingsRes.status === 'fulfilled' && driverBookingsRes.value) {
        const fetchedBookings = driverBookingsRes.value.data.data ?? [];
        setBookings(fetchedBookings);

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
          setPassengerCommentCounts(countsMap);
        }
      }
    } else {
      // Passenger: find my booking for this trip + driver comment count
      if (myBookingsRes.status === 'fulfilled' && myBookingsRes.value) {
        const existing = (myBookingsRes.value.data.data ?? []).find(
          (b) => b.tripId === t.id,
        );
        setMyBooking(existing ?? null);
      } else {
        setMyBooking(null);
      }

      if (driverCommentRes.status === 'fulfilled' && driverCommentRes.value) {
        setDriverCommentCount(driverCommentRes.value.data.data ?? null);
      }
    }
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await tripsApi.getDetails(id);
      if (!res.data) throw new Error('Viaje no encontrado');
      const t = res.data;
      setTrip(t);
      // Flip loading off as soon as the critical data is in so the screen
      // renders immediately. Secondary data hydrates progressively below.
      setLoading(false);

      void loadSecondary(t);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar el viaje');
      setLoading(false);
    }
  }, [id, loadSecondary]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived ──

  const isDriver = trip && user ? trip.driverId === user.id : false;
  const canEdit =
    isDriver && (trip?.status === 'DRAFT' || trip?.status === 'PUBLISHED');
  const canBook =
    !isDriver &&
    trip?.status === 'PUBLISHED' &&
    (trip?.availableSeats ?? 0) > 0 &&
    myBooking === null;

  // ── Actions ──

  const runAction = async (
    label: string,
    action: () => Promise<void>,
    confirmMsg?: string,
  ) => {
    if (confirmMsg) {
      await new Promise<void>((resolve, reject) => {
        Alert.alert(label, confirmMsg, [
          { text: 'Cancelar', style: 'cancel', onPress: () => reject() },
          {
            text: 'Confirmar',
            style: 'destructive',
            onPress: () => resolve(),
          },
        ]);
      });
    }
    setActionLoading(label);
    try {
      await action();
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = () =>
    runAction('Publicar', async () => {
      const { data: res } = await tripsApi.publish(id);
      if (res.data) setTrip(res.data);
      Toast.show({
        type: 'success',
        text1: '¡Viaje publicado!',
        text2: 'Ya es visible para pasajeros',
      });
    });

  const handleStart = () =>
    runAction(
      'Iniciar viaje',
      async () => {
        const { data: res } = await tripsApi.start(id);
        if (res.data) setTrip(res.data);
        Toast.show({ type: 'success', text1: 'Viaje iniciado' });
      },
      '¿Confirmas que el viaje está en camino?',
    );

  const handleComplete = () =>
    runAction(
      'Completar',
      async () => {
        const { data: res } = await tripsApi.complete(id);
        if (res.data) setTrip(res.data);
        Toast.show({ type: 'success', text1: 'Viaje completado' });
      },
      '¿Confirmas que llegaste al destino?',
    );

  const handleCancel = () =>
    runAction(
      'Cancelar viaje',
      async () => {
        await tripsApi.cancel(id);
        setTrip((t) => (t ? { ...t, status: 'CANCELLED' } : t));
        Toast.show({ type: 'success', text1: 'Viaje cancelado' });
      },
      '¿Seguro que quieres cancelar este viaje? Esta acción no se puede deshacer.',
    );

  const handleCancelBooking = () => {
    if (!myBooking) return;
    Alert.alert('Cancelar reserva', '¿Seguro que quieres cancelar tu reserva?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setActionLoading('cancel-booking');
          try {
            await bookingsApi.cancel(myBooking.id);
            setMyBooking({ ...myBooking, status: 'CANCELLED' });
            Toast.show({ type: 'success', text1: 'Reserva cancelada' });
          } catch (err: any) {
            Alert.alert(
              'Error',
              err?.response?.data?.message ?? 'No se pudo cancelar',
            );
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const openMap = async () => {
    if (!trip) return;

    const needsWaypoints = waypointsFull.length === 0;
    const needsRoutePolyline = routePolyline.length === 0;
    if (!needsWaypoints && !needsRoutePolyline) return;

    if (needsWaypoints) setLoadingWaypoints(true);
    if (needsRoutePolyline) setLoadingRoutePolyline(true);

    let resolvedWaypoints = waypointsFull;

    try {
      if (needsWaypoints) {
        try {
          const { data: res } = await tripsApi.getWaypoints(id);
          const fetched = res.data ?? [];
          if (fetched.length > 0) {
            resolvedWaypoints = fetched;
            setWaypointsFull(fetched);
          } else if (trip.waypoints && trip.waypoints.length > 0) {
            resolvedWaypoints = mapEmbeddedWaypoints(trip);
            setWaypointsFull(resolvedWaypoints);
          }
        } catch {
          if (trip.waypoints && trip.waypoints.length > 0) {
            resolvedWaypoints = mapEmbeddedWaypoints(trip);
            setWaypointsFull(resolvedWaypoints);
          }
        }
      }

      if (needsRoutePolyline) {
        if (trip.routePolyline && trip.routePolyline.length >= 2) {
          setRoutePolyline(trip.routePolyline);
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
            if (tomtomService.isConfigured()) {
              const { points } = await tomtomService.calculateRoute(stopPoints);
              setRoutePolyline(points.length >= 2 ? points : stopPoints);
            } else {
              setRoutePolyline(stopPoints);
            }
          } catch {
            setRoutePolyline(stopPoints);
          }
        }
      }
    } finally {
      if (needsWaypoints) setLoadingWaypoints(false);
      if (needsRoutePolyline) setLoadingRoutePolyline(false);
    }
  };

  const handleRateDriver = async (score: number, comment: string) => {
    if (!trip) return;
    await ratingsApi.create({
      revieweeId: trip.driverId,
      tripId: trip.id,
      score,
      comment: comment || undefined,
    });
    setRatedUserIds((prev) => new Set([...prev, trip.driverId]));
    Toast.show({ type: 'success', text1: '¡Calificación enviada!', text2: 'Gracias por tu opinión' });
  };

  const handleRatePassenger = async (passengerUserId: string, score: number, comment: string) => {
    if (!trip) return;
    await ratingsApi.create({
      revieweeId: passengerUserId,
      tripId: trip.id,
      score,
      comment: comment || undefined,
    });
    setRatedUserIds((prev) => new Set([...prev, passengerUserId]));
    Toast.show({ type: 'success', text1: '¡Calificación enviada!', text2: 'Gracias por tu opinión' });
  };

  const handleBookingAction = async (
    bookingId: string,
    action: 'accept' | 'reject' | 'board' | 'noshow',
  ) => {
    const label = `${bookingId}-${action}`;
    setActionLoading(label);
    try {
      let updated: BookingResponse | undefined;
      if (action === 'accept') {
        const { data: r } = await bookingsApi.accept(bookingId);
        updated = r.data ?? undefined;
      }
      if (action === 'reject') {
        const { data: r } = await bookingsApi.reject(bookingId);
        updated = r.data ?? undefined;
      }
      if (action === 'board') {
        const { data: r } = await bookingsApi.board(bookingId);
        updated = r.data ?? undefined;
      }
      if (action === 'noshow') {
        const { data: r } = await bookingsApi.noShow(bookingId);
        updated = r.data ?? undefined;
      }

      if (updated) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? updated! : b)),
        );
        const { data: tRes } = await tripsApi.getDetails(id);
        if (tRes.data) setTrip(tRes.data);
      }
      const msgs: Record<string, string> = {
        accept: 'Reserva aceptada',
        reject: 'Reserva rechazada',
        board: 'Abordaje registrado',
        noshow: 'No-show registrado',
      };
      Toast.show({ type: 'success', text1: msgs[action] });
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message ?? 'No se pudo completar la acción',
      );
    } finally {
      setActionLoading(null);
    }
  };

  return {
    trip,
    setTrip,
    vehicle,
    bookings,
    myBooking,
    setMyBooking,
    loading,
    error,
    actionLoading,
    isDriver,
    canEdit,
    canBook,
    ratedUserIds,
    driverCommentCount,
    passengerCommentCounts,
    waypointsFull,
    loadingWaypoints,
    routePolyline,
    loadingRoutePolyline,
    load,
    handlePublish,
    handleStart,
    handleComplete,
    handleCancel,
    handleCancelBooking,
    openMap,
    handleBookingAction,
    handleRateDriver,
    handleRatePassenger,
  };
}

function mapEmbeddedWaypoints(trip: TripResponse): RouteWaypointResponse[] {
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
