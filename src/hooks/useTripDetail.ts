import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { tripsApi } from '@/api/trips';
import { bookingsApi } from '@/api/bookings';
import { vehiclesApi } from '@/api/vehicles';
import { useAuthStore } from '@/stores/auth-store';
import type {
  TripResponse,
  VehicleResponse,
  BookingResponse,
  RouteWaypointResponse,
} from '@/types/api';
import Toast from 'react-native-toast-message';

export function useTripDetail(id: string) {
  const user = useAuthStore((s) => s.user);

  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [myBooking, setMyBooking] = useState<BookingResponse | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Route map
  const [waypointsFull, setWaypointsFull] = useState<RouteWaypointResponse[]>([]);
  const [loadingWaypoints, setLoadingWaypoints] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await tripsApi.getDetails(id);
      if (!res.data) throw new Error('Viaje no encontrado');
      const t = res.data;
      setTrip(t);

      try {
        const { data: vRes } = await vehiclesApi.getById(t.vehicleId);
        if (vRes.data) setVehicle(vRes.data);
      } catch { }

      const isDriver = user?.id === t.driverId;

      if (isDriver) {
        try {
          const { data: bRes } = await bookingsApi.getByTrip(t.id);
          setBookings(bRes.data ?? []);
        } catch { }
      } else {
        try {
          const { data: bRes } = await bookingsApi.getMine();
          const existing = (bRes.data ?? []).find((b) => b.tripId === t.id);
          setMyBooking(existing ?? null);
        } catch {
          setMyBooking(null);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar el viaje');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

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
    if (waypointsFull.length > 0) return;
    setLoadingWaypoints(true);
    try {
      const { data: res } = await tripsApi.getWaypoints(id);
      const fetched = res.data ?? [];
      if (fetched.length > 0) {
        setWaypointsFull(fetched);
      } else if (trip?.waypoints && trip.waypoints.length > 0) {
        setWaypointsFull(mapEmbeddedWaypoints(trip));
      }
    } catch {
      if (trip?.waypoints && trip.waypoints.length > 0) {
        setWaypointsFull(mapEmbeddedWaypoints(trip));
      }
    } finally {
      setLoadingWaypoints(false);
    }
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
    waypointsFull,
    loadingWaypoints,
    load,
    handlePublish,
    handleStart,
    handleComplete,
    handleCancel,
    handleCancelBooking,
    openMap,
    handleBookingAction,
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
