import { useCallback, useEffect, useReducer, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { tripsApi } from '@/api/trips';
import { routineSubscriptionsApi } from '@/api/routine-subscriptions';
import { useRoutineTripsStore } from '@/stores/routine-trips-store';
import { useRoutineSubscriptionsStore } from '@/stores/routine-subscriptions-store';
import { haversineMeters } from '@/lib/geo';
import {
  occurrenceDetailReducer,
  initialOccurrenceDetailState,
} from '@/reducers/occurrence-detail.reducer';
import type {
  TripResponse,
  RoutineTripResponse,
  RoutineWaypointResponse,
  RoutineBookingResponse,
  RoutineSubscriptionResponse,
  RecurrenceDay,
} from '@/types/api';

// ── Types ──

export type OrderedStop =
  | { kind: 'origin'; lat: number; lng: number; name: string; }
  | { kind: 'waypoint'; data: RoutineWaypointResponse; routeIdx: number; }
  | { kind: 'passenger'; booking: RoutineBookingResponse; sub: RoutineSubscriptionResponse; pickupLat: number; pickupLng: number; routeIdx: number; }
  | { kind: 'destination'; lat: number; lng: number; name: string; };

// ── Helpers ──

const DAY_MAP: Record<number, RecurrenceDay> = {
  0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
};

function waypointAppliesToDate(wp: RoutineWaypointResponse, date: Date): boolean {
  if (!wp.applicableDays?.length) return true;
  return wp.applicableDays.includes(DAY_MAP[date.getDay()]);
}

function closestRouteIdx(
  coords: { latitude: number; longitude: number; }[],
  lat: number,
  lng: number,
): number {
  let best = 0;
  let minD = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = haversineMeters(coords[i].latitude, coords[i].longitude, lat, lng);
    if (d < minD) { minD = d; best = i; }
  }
  return best;
}

/** Resolve pickup coordinates for a booking using subscription and trip waypoints */
function resolvePickupCoords(
  booking: RoutineBookingResponse,
  sub: RoutineSubscriptionResponse,
  waypoints: RoutineWaypointResponse[],
  routineTrip: RoutineTripResponse,
): { lat: number; lng: number; } | null {
  if (booking.pickupWaypointId) {
    const wp = waypoints.find((w) => w.id === booking.pickupWaypointId);
    if (wp) return { lat: wp.latitude, lng: wp.longitude };
  }
  if (sub.customPickupLatitude != null && sub.customPickupLongitude != null) {
    return { lat: sub.customPickupLatitude, lng: sub.customPickupLongitude };
  }
  return { lat: routineTrip.originLatitude, lng: routineTrip.originLongitude };
}

function buildOrderedStops(
  routineTrip: RoutineTripResponse,
  occurrence: TripResponse,
  bookings: RoutineBookingResponse[],
  subscriptions: RoutineSubscriptionResponse[],
  waypoints: RoutineWaypointResponse[],
): OrderedStop[] {
  const occDate = new Date(occurrence.departureAt);
  const routeCoords = routineTrip.routeLine?.map((p) => ({ latitude: p[0], longitude: p[1] })) ?? [];
  const withIdx = (lat: number, lng: number) =>
    routeCoords.length >= 2 ? closestRouteIdx(routeCoords, lat, lng) : 0;

  const subById = new Map(subscriptions.map((s) => [s.id, s]));

  // Filter waypoints by applicableDays for this occurrence date
  const activeWaypoints = waypoints.filter((wp) => waypointAppliesToDate(wp, occDate));

  const entries: Array<{ stop: OrderedStop; idx: number; }> = [];

  for (const wp of activeWaypoints) {
    entries.push({
      stop: { kind: 'waypoint', data: wp, routeIdx: withIdx(wp.latitude, wp.longitude) },
      idx: withIdx(wp.latitude, wp.longitude),
    });
  }

  for (const booking of bookings) {
    if (booking.status !== 'ACCEPTED' && booking.status !== 'BOARDED') continue;
    const sub = subById.get(booking.subscriptionId);
    if (!sub) continue;
    const coords = resolvePickupCoords(booking, sub, waypoints, routineTrip);
    if (!coords) continue;
    const idx = withIdx(coords.lat, coords.lng);
    entries.push({
      stop: { kind: 'passenger', booking, sub, pickupLat: coords.lat, pickupLng: coords.lng, routeIdx: idx },
      idx,
    });
  }

  entries.sort((a, b) => a.idx - b.idx);

  return [
    { kind: 'origin', lat: routineTrip.originLatitude, lng: routineTrip.originLongitude, name: routineTrip.originName },
    ...entries.map((e) => e.stop),
    { kind: 'destination', lat: routineTrip.destinationLatitude, lng: routineTrip.destinationLongitude, name: routineTrip.destinationName },
  ];
}

// ── Hook ──

export function useOccurrenceDetail(routineTripId: string | undefined, tripId: string | undefined) {
  const router = useRouter();
  const routineTripsStore = useRoutineTripsStore();
  const subscriptionsStore = useRoutineSubscriptionsStore();

  const [uiState, dispatch] = useReducer(occurrenceDetailReducer, initialOccurrenceDetailState);
  const [occurrence, setOccurrence] = useState<TripResponse | null>(null);
  const [bookings, setBookings] = useState<RoutineBookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const routineTrip = routineTripId
    ? (routineTripsStore.selectedRoutineTrip?.id === routineTripId
      ? routineTripsStore.selectedRoutineTrip
      : routineTripsStore.myRoutineTrips.find((t) => t.id === routineTripId) ?? null)
    : null;
  const waypoints = routineTripsStore.waypoints;
  const subscriptions = routineTripId
    ? (subscriptionsStore.subscriptionsByTrip[routineTripId] ?? [])
    : [];

  const load = useCallback(async () => {
    if (!routineTripId || !tripId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [occRes, bkgRes] = await Promise.all([
        tripsApi.getById(tripId),
        tripsApi.getRoutineBookings(tripId),
      ]);
      setOccurrence(occRes.data.data ?? null);
      setBookings(bkgRes.data.data ?? []);

      // Ensure template data is cached
      const needsTrip = !routineTripsStore.myRoutineTrips.find((t) => t.id === routineTripId) &&
        routineTripsStore.selectedRoutineTrip?.id !== routineTripId;
      const needsWaypoints = routineTripsStore.waypoints.length === 0;
      const needsSubs = !subscriptionsStore.subscriptionsByTrip[routineTripId];

      await Promise.all([
        needsTrip ? routineTripsStore.fetchById(routineTripId) : Promise.resolve(),
        needsWaypoints ? routineTripsStore.fetchWaypoints(routineTripId) : Promise.resolve(),
        needsSubs ? subscriptionsStore.fetchForTrip(routineTripId) : Promise.resolve(),
      ]);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string; }; }; message?: string; };
      setError(anyErr?.response?.data?.message ?? anyErr?.message ?? 'Error al cargar la ocurrencia');
    } finally {
      setIsLoading(false);
    }
  }, [routineTripId, tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const orderedStops: OrderedStop[] = routineTrip && occurrence
    ? buildOrderedStops(routineTrip, occurrence, bookings, subscriptions, waypoints)
    : [];

  // ── Actions ──

  const markNoShow = useCallback(async (bookingId: string) => {
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      await routineSubscriptionsApi.markNoShow(bookingId);
      setBookings((prev) =>
        prev.map((b) => b.id === bookingId ? { ...b, status: 'NO_SHOW' as const } : b),
      );
      dispatch({ type: 'CLOSE_MODAL' });
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string; }; }; message?: string; };
      Alert.alert('Error', anyErr?.response?.data?.message ?? anyErr?.message ?? 'No se pudo marcar el no-show');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, []);

  const overridePickup = useCallback(async (bookingId: string, lat: number, lng: number, name: string) => {
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      await routineSubscriptionsApi.overridePickup(bookingId, { latitude: lat, longitude: lng, name });
      // Reflect the new pickup in local subscription state
      setBookings((prev) =>
        prev.map((b) => b.id === bookingId ? { ...b, pickupWaypointId: undefined } : b),
      );
      // Update corresponding subscription coords locally
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        subscriptionsStore.updateInTrip(routineTripId!, {
          ...(subscriptions.find((s) => s.id === booking.subscriptionId)!),
          customPickupLatitude: lat,
          customPickupLongitude: lng,
          customPickupName: name,
        });
      }
      dispatch({ type: 'CLOSE_MODAL' });
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string; }; }; message?: string; };
      Alert.alert('Error', anyErr?.response?.data?.message ?? anyErr?.message ?? 'No se pudo actualizar el punto');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [bookings, subscriptions, routineTripId]);

  const cancelOccurrence = useCallback(async () => {
    if (!tripId) return;
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      await tripsApi.cancel(tripId);
      dispatch({ type: 'CLOSE_MODAL' });
      router.back();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string; }; }; message?: string; };
      Alert.alert('Error', anyErr?.response?.data?.message ?? anyErr?.message ?? 'No se pudo cancelar el día');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [tripId, router]);

  const isFutureOccurrence = occurrence
    ? new Date(occurrence.departureAt).getTime() > Date.now()
    : false;

  return {
    occurrence,
    routineTrip,
    waypoints,
    bookings,
    subscriptions,
    orderedStops,
    isLoading,
    error,
    isFutureOccurrence,
    uiState,
    dispatch,
    actions: { markNoShow, overridePickup, cancelOccurrence, refetch: load },
  };
}
