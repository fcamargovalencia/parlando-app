import { useMemo } from 'react';
import { useRoutineTripsStore } from '@/stores/routine-trips-store';
import { useRoutineSubscriptionsStore } from '@/stores/routine-subscriptions-store';
import { haversineMeters } from '@/lib/geo';
import type {
  DayStop,
  RecurrenceDay,
  RoutineWaypointResponse,
  RoutineSubscriptionResponse,
  RoutineTripResponse,
} from '@/types/api';

// ── Helpers ──

const DAY_MAP: Record<number, RecurrenceDay> = {
  0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
};

/** Day number (0=Sun) for a RecurrenceDay string */
const DAY_NUM: Record<RecurrenceDay, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

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

function buildDayOrderedStops(
  routineTrip: RoutineTripResponse,
  activeSubscriptions: RoutineSubscriptionResponse[],
  activeWaypoints: RoutineWaypointResponse[],
): DayStop[] {
  const routeCoords = routineTrip.routeLine?.map((p) => ({ latitude: p[0], longitude: p[1] })) ?? [];
  const withIdx = (lat: number, lng: number) =>
    routeCoords.length >= 2 ? closestRouteIdx(routeCoords, lat, lng) : 0;

  const entries: Array<{ stop: DayStop; idx: number; }> = [];

  for (const wp of activeWaypoints) {
    const idx = withIdx(wp.latitude, wp.longitude);
    entries.push({ stop: { kind: 'waypoint', data: wp, routeIdx: idx }, idx });
  }

  for (const sub of activeSubscriptions) {
    let lat: number | undefined;
    let lng: number | undefined;

    if (sub.customPickupLatitude != null && sub.customPickupLongitude != null) {
      lat = sub.customPickupLatitude;
      lng = sub.customPickupLongitude;
    } else if (sub.pickupWaypointId) {
      const wp = activeWaypoints.find((w) => w.id === sub.pickupWaypointId);
      if (wp) { lat = wp.latitude; lng = wp.longitude; }
    }

    if (lat == null || lng == null) {
      lat = routineTrip.originLatitude;
      lng = routineTrip.originLongitude;
    }

    const idx = withIdx(lat, lng);
    entries.push({ stop: { kind: 'subscriber', sub, routeIdx: idx }, idx });
  }

  entries.sort((a, b) => a.idx - b.idx);

  return [
    { kind: 'origin', lat: routineTrip.originLatitude, lng: routineTrip.originLongitude, name: routineTrip.originName },
    ...entries.map((e) => e.stop),
    { kind: 'destination', lat: routineTrip.destinationLatitude, lng: routineTrip.destinationLongitude, name: routineTrip.destinationName },
  ];
}

// ── Hook ──

export function useDayVariant(routineTripId: string | undefined, selectedDay: RecurrenceDay | null) {
  const routineTripsStore = useRoutineTripsStore();
  const subscriptionsStore = useRoutineSubscriptionsStore();

  const routineTrip = routineTripId
    ? (routineTripsStore.selectedRoutineTrip?.id === routineTripId
      ? routineTripsStore.selectedRoutineTrip
      : routineTripsStore.myRoutineTrips.find((t) => t.id === routineTripId) ?? null)
    : null;

  const allWaypoints = routineTripsStore.waypoints;
  const allSubscriptions = routineTripId
    ? (subscriptionsStore.subscriptionsByTrip[routineTripId] ?? [])
    : [];

  const activeSubscriptions = useMemo(() => {
    if (!selectedDay) return [];
    return allSubscriptions.filter(
      (s) => s.status === 'ACCEPTED' && s.subscribedDays.includes(selectedDay),
    );
  }, [allSubscriptions, selectedDay]);

  const activeWaypoints = useMemo(() => {
    if (!selectedDay) return [];
    return allWaypoints.filter(
      (wp) => !wp.applicableDays?.length || wp.applicableDays.includes(selectedDay),
    );
  }, [allWaypoints, selectedDay]);

  const dayStops = useMemo<DayStop[]>(() => {
    if (!routineTrip || !selectedDay) return [];
    return buildDayOrderedStops(routineTrip, activeSubscriptions, activeWaypoints);
  }, [routineTrip, activeSubscriptions, activeWaypoints, selectedDay]);

  return {
    routineTrip,
    dayStops,
    activeSubscriptions,
    activeWaypoints,
    hasData: routineTrip != null,
  };
}
