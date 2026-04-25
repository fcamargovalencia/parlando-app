import { useState, useCallback, useRef, useEffect } from 'react';
import MapView from 'react-native-maps';
import { Alert } from 'react-native';
import { tomtomService } from '@/lib/tomtom';
import { tripsApi } from '@/api/trips';
import { extractApiError } from '@/lib/utils';
import type { TripResponse } from '@/types/api';
import type { SelectedLocation } from '@/hooks/useLocationPicker';

export type EditableWaypoint = {
  id?: string;
  latitude: number;
  longitude: number;
  name: string;
  subtitle?: string;
  isPickupPoint: boolean;
};

type Coord = { latitude: number; longitude: number };

export function useEditRouteModal(
  trip: TripResponse,
  visible: boolean,
  onSuccess: (updated: TripResponse) => void,
  onClose: () => void,
) {
  const mapRef = useRef<MapView>(null);
  const [waypoints, setWaypoints] = useState<EditableWaypoint[]>([]);
  const [routePolyline, setRoutePolyline] = useState<Coord[]>([]);
  const [isLoadingWaypoints, setIsLoadingWaypoints] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const origin: Coord = { latitude: trip.originLatitude, longitude: trip.originLongitude };
  const destination: Coord = { latitude: trip.destinationLatitude, longitude: trip.destinationLongitude };

  useEffect(() => {
    if (!visible) return;

    const initPolyline =
      trip.routePolyline && trip.routePolyline.length >= 2
        ? trip.routePolyline
        : [origin, destination];
    setRoutePolyline(initPolyline);
    setIsLoadingWaypoints(true);

    tripsApi
      .getWaypoints(trip.id)
      .then(({ data: res }) => {
        const fetched = (res.data ?? []).sort((a, b) => a.orderIndex - b.orderIndex);
        setWaypoints(
          fetched.map((w) => ({
            id: w.id,
            latitude: w.latitude,
            longitude: w.longitude,
            name: w.name,
            subtitle: w.subtitle,
            isPickupPoint: w.isPickupPoint,
          })),
        );
      })
      .catch(() => {
        const embedded = (trip.waypoints ?? [])
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((w) => ({
            id: w.id,
            latitude: w.latitude,
            longitude: w.longitude,
            name: w.name,
            subtitle: w.subtitle,
            isPickupPoint: w.isPickupPoint,
          }));
        setWaypoints(embedded);
      })
      .finally(() => setIsLoadingWaypoints(false));
  }, [visible, trip.id]);

  const recalculateRoute = useCallback(
    async (wps: EditableWaypoint[]): Promise<Coord[]> => {
      const stops: Coord[] = [origin, ...wps, destination];
      setIsCalculating(true);
      try {
        if (tomtomService.isConfigured()) {
          const result = await tomtomService.calculateRoute(stops);
          if (result.points.length >= 2) {
            setRoutePolyline(result.points);
            return result.points;
          }
        }
      } catch {
        // keep existing polyline on error
      } finally {
        setIsCalculating(false);
      }
      setRoutePolyline(stops);
      return stops;
    },
    [origin, destination],
  );

  const handleAddWaypoint = useCallback(
    (loc: SelectedLocation) => {
      const newWp: EditableWaypoint = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: loc.name,
        subtitle: loc.subtitle ?? undefined,
        isPickupPoint: true,
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

  const handlePreviewRoute = useCallback(async () => {
    const coords = await recalculateRoute(waypoints);
    if (coords.length >= 2) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
          animated: true,
        });
      }, 300);
    }
  }, [waypoints, recalculateRoute]);

  const handleUpdateRoute = useCallback(async () => {
    setIsSaving(true);
    try {
      const waypointRequests = waypoints.map((w, i) => ({
        latitude: w.latitude,
        longitude: w.longitude,
        orderIndex: i,
        name: w.name,
        subtitle: w.subtitle,
        isPickupPoint: w.isPickupPoint,
      }));
      const { data: res } = await tripsApi.update(trip.id, {
        waypoints: waypointRequests,
        routePolyline,
      });
      if (res.data) onSuccess(res.data);
      Alert.alert('Ruta actualizada', 'La ruta del viaje fue actualizada exitosamente.', [
        { text: 'Aceptar', onPress: onClose },
      ]);
    } catch (err) {
      Alert.alert('Error', extractApiError(err, 'No se pudo actualizar la ruta'));
    } finally {
      setIsSaving(false);
    }
  }, [trip.id, waypoints, routePolyline, onSuccess, onClose]);

  return {
    mapRef,
    waypoints,
    routePolyline,
    isLoadingWaypoints,
    isCalculating,
    isSaving,
    showPicker,
    setShowPicker,
    origin,
    destination,
    handleAddWaypoint,
    handleRemove,
    handleMoveUp,
    handleMoveDown,
    handlePreviewRoute,
    handleUpdateRoute,
  };
}
