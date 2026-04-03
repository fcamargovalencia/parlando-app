import { useState, useRef, useEffect, useCallback } from 'react';
import MapView from 'react-native-maps';
import { tomtomService } from '@/lib/tomtom';
import type { SelectedLocation } from '@/components/LocationPickerModal';

export type RouteAlternative = {
  id: string;
  title: string;
  points: { latitude: number; longitude: number; }[];
  distanceKm: number;
  durationMin: number;
  hasTolls: boolean;
  travelTimeInSeconds?: number;
};

function routeDistanceKm(points: { latitude: number; longitude: number; }[]) {
  if (points.length < 2) return 0;
  let total = 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  return total;
}

function buildFallback(
  origin: SelectedLocation,
  destination: SelectedLocation,
  waypoints: SelectedLocation[],
): RouteAlternative[] {
  const points = [
    { latitude: origin.latitude, longitude: origin.longitude },
    ...waypoints.map((w) => ({ latitude: w.latitude, longitude: w.longitude })),
    { latitude: destination.latitude, longitude: destination.longitude },
  ];
  const distance = routeDistanceKm(points);
  return [{
    id: 'DIRECT',
    title: 'Ruta directa',
    points,
    distanceKm: distance,
    durationMin: Math.max(1, Math.round((distance / 72) * 60)),
    hasTolls: false,
  }];
}

const LOCK_MS = 450;

export function useRouteAlternatives(
  origin: SelectedLocation | null,
  destination: SelectedLocation | null,
  waypoints: SelectedLocation[],
  active: boolean,
) {
  const [alternatives, setAlternatives] = useState<RouteAlternative[]>([]);
  const [selectedId, setSelectedId] = useState<string>('DIRECT');
  const [locked, setLocked] = useState(false);
  const mapRef = useRef<MapView>(null);
  const lockRef = useRef(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute selected route
  const selected = alternatives.find((r) => r.id === selectedId) ?? null;

  // Derive route mode from selection index
  const selectedIndex = alternatives.findIndex((r) => r.id === selectedId);
  const routeMode: 'DIRECT' | 'FLEXIBLE' | 'WITH_STOPS' =
    selectedIndex <= 0 ? 'DIRECT' : selectedIndex === 1 ? 'FLEXIBLE' : 'WITH_STOPS';

  // Fetch alternatives when active
  useEffect(() => {
    if (!origin || !destination) {
      setAlternatives([]);
      return;
    }
    if (!active) return;

    const fallback = buildFallback(origin, destination, waypoints);
    setAlternatives(fallback);
    setSelectedId(fallback[0]?.id ?? 'DIRECT');

    if (tomtomService.isConfigured()) {
      const stops = [
        { latitude: origin.latitude, longitude: origin.longitude },
        ...waypoints.map((w) => ({ latitude: w.latitude, longitude: w.longitude })),
        { latitude: destination.latitude, longitude: destination.longitude },
      ];
      tomtomService
        .calculateRouteAlternatives(stops, { maxPoints: 80, maxAlternatives: 2 })
        .then((alts) => {
          if (alts.length > 0) {
            setAlternatives(alts);
            setSelectedId(alts[0].id);
          }
        })
        .catch(() => { /* keep fallback */ });
    }
  }, [active, origin, destination, waypoints]);

  // Fit map to selected route
  useEffect(() => {
    const route = alternatives.find((r) => r.id === selectedId) ?? alternatives[0];
    if (!active || !route || route.points.length < 2 || !mapRef.current) return;

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(route.points, {
        edgePadding: { top: 64, right: 48, bottom: 100, left: 48 },
        animated: true,
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [active, alternatives, selectedId]);

  // Cleanup lock timer
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockRef.current = false;
    };
  }, []);

  const selectById = useCallback(
    (routeId: string) => {
      if (lockRef.current) return;
      if (!alternatives.some((r) => r.id === routeId)) return;
      if (routeId === selectedId) return;

      lockRef.current = true;
      setLocked(true);
      setSelectedId(routeId);

      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => {
        lockRef.current = false;
        setLocked(false);
      }, LOCK_MS);
    },
    [alternatives, selectedId],
  );

  const selectByOffset = useCallback(
    (offset: number) => {
      if (alternatives.length < 2) return;
      const idx = alternatives.findIndex((r) => r.id === selectedId);
      if (idx < 0) return;
      const next = (idx + offset + alternatives.length) % alternatives.length;
      if (alternatives[next]) selectById(alternatives[next].id);
    },
    [alternatives, selectedId, selectById],
  );

  return {
    alternatives,
    selected,
    selectedId,
    routeMode,
    locked,
    mapRef,
    selectById,
    selectByOffset,
  };
}
