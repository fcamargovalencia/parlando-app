import { useState, useCallback, useRef, useEffect } from 'react';
import MapView from 'react-native-maps';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { tomtomService } from '@/lib/tomtom';
import { routineTripsApi } from '@/api/routine-trips';
import { extractApiError } from '@/lib/utils';
import type { RoutineTripResponse, RoutineWaypointResponse } from '@/types/api';
import type { SelectedLocation } from '@/hooks/useLocationPicker';

export type ModalWaypoint = {
  id?: string;
  latitude: number;
  longitude: number;
  name: string;
  subtitle?: string;
  isPickupPoint: boolean;
  estimatedMinutesOffset: number;
};

type Coord = { latitude: number; longitude: number; };

export function useRoutineEditRouteModal(
  trip: RoutineTripResponse,
  existingWaypoints: RoutineWaypointResponse[],
  visible: boolean,
  onDone: () => void,
) {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const origin: Coord = { latitude: trip.originLatitude, longitude: trip.originLongitude };
  const destination: Coord = { latitude: trip.destinationLatitude, longitude: trip.destinationLongitude };

  const [waypoints, setWaypoints] = useState<ModalWaypoint[]>([]);
  const [routePolyline, setRoutePolyline] = useState<Coord[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const sorted = [...existingWaypoints].sort((a, b) => a.orderIndex - b.orderIndex);
    setWaypoints(
      sorted.map((w) => ({
        id: w.id,
        latitude: w.latitude,
        longitude: w.longitude,
        name: w.name,
        subtitle: w.subtitle,
        isPickupPoint: w.isPickupPoint,
        estimatedMinutesOffset: w.estimatedMinutesOffset,
      })),
    );

    const initialPolyline: Coord[] = trip.routeLine
      ? trip.routeLine.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
      : [];
    setRoutePolyline(initialPolyline.length >= 2 ? initialPolyline : [origin, destination]);
  }, [visible, existingWaypoints.length]);

  const fitMap = useCallback((coords: Coord[]) => {
    if (coords.length < 2) return;
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
    }, 300);
  }, []);

  const recalculateRoute = useCallback(
    async (wps: ModalWaypoint[]): Promise<Coord[]> => {
      const stops: Coord[] = [origin, ...wps, destination];
      setIsCalculating(true);
      try {
        if (tomtomService.isConfigured()) {
          const result = await tomtomService.calculateRoute(stops);
          if (result.points.length >= 2) {
            setRoutePolyline(result.points);
            fitMap(result.points);
            return result.points;
          }
        }
      } catch {
        // keep existing on error
      } finally {
        setIsCalculating(false);
      }
      setRoutePolyline(stops);
      fitMap(stops);
      return stops;
    },
    [origin, destination, fitMap],
  );

  const handleAddWaypoint = useCallback(
    (loc: SelectedLocation) => {
      const newWp: ModalWaypoint = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: loc.name,
        subtitle: loc.subtitle ?? undefined,
        isPickupPoint: true,
        estimatedMinutesOffset: 5,
      };
      const updated = [...waypoints, newWp];
      setWaypoints(updated);
      setShowPicker(false);
      void recalculateRoute(updated);
    },
    [waypoints, recalculateRoute],
  );

  const handleRemove = useCallback(
    (idx: number) => {
      const updated = waypoints.filter((_, i) => i !== idx);
      setWaypoints(updated);
      void recalculateRoute(updated);
    },
    [waypoints, recalculateRoute],
  );

  const handleMoveUp = useCallback(
    (idx: number) => {
      if (idx === 0) return;
      const updated = [...waypoints];
      [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
      setWaypoints(updated);
      void recalculateRoute(updated);
    },
    [waypoints, recalculateRoute],
  );

  const handleMoveDown = useCallback(
    (idx: number) => {
      if (idx === waypoints.length - 1) return;
      const updated = [...waypoints];
      [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
      setWaypoints(updated);
      void recalculateRoute(updated);
    },
    [waypoints, recalculateRoute],
  );

  const handleUpdateMinutes = useCallback((idx: number, value: string) => {
    const minutes = parseInt(value, 10);
    if (isNaN(minutes) || minutes < 0) return;
    setWaypoints((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, estimatedMinutesOffset: minutes } : w)),
    );
  }, []);

  const handleTogglePickup = useCallback((idx: number) => {
    setWaypoints((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, isPickupPoint: !w.isPickupPoint } : w)),
    );
  }, []);

  const handleUpdateRoute = useCallback(async () => {
    setIsSaving(true);
    try {
      // Add new waypoints sequentially, collecting their IDs
      const finalOrderIds: string[] = [];
      for (const wp of waypoints) {
        if (wp.id) {
          finalOrderIds.push(wp.id);
        } else {
          const { data: res } = await routineTripsApi.addWaypoint(trip.id, {
            orderIndex: finalOrderIds.length,
            latitude: wp.latitude,
            longitude: wp.longitude,
            name: wp.name,
            subtitle: wp.subtitle,
            isPickupPoint: wp.isPickupPoint,
            estimatedMinutesOffset: wp.estimatedMinutesOffset,
          });
          if (res.data) finalOrderIds.push(res.data.id);
        }
      }

      // Reorder to match desired sequence
      if (finalOrderIds.length > 0) {
        await routineTripsApi.reorderWaypoints(trip.id, { orderedIds: finalOrderIds });
      }

      // Update route polyline on the routine trip
      await routineTripsApi.update(trip.id, { routePolyline });

      Alert.alert('Ruta actualizada', 'La ruta rutinaria fue actualizada exitosamente.', [
        {
          text: 'Aceptar',
          onPress: () => {
            onDone();
            router.replace(`/routine/${trip.id}` as never);
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', extractApiError(err, 'No se pudo actualizar la ruta'));
    } finally {
      setIsSaving(false);
    }
  }, [trip.id, waypoints, routePolyline, onDone, router]);

  const hasNewWaypoints = waypoints.some((w) => !w.id);

  return {
    mapRef,
    waypoints,
    routePolyline,
    isCalculating,
    isSaving,
    showPicker,
    hasNewWaypoints,
    setShowPicker,
    fitMap,
    origin,
    destination,
    handleAddWaypoint,
    handleRemove,
    handleMoveUp,
    handleMoveDown,
    handleUpdateMinutes,
    handleTogglePickup,
    handleUpdateRoute,
  };
}
