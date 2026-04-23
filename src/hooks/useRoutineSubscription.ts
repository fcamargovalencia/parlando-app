import { useState, useCallback, useEffect } from 'react';
import { routineTripsApi } from '@/api/routine-trips';
import { routineSubscriptionsApi } from '@/api/routine-subscriptions';
import { extractApiError } from '@/lib/utils';
import { haversineMeters } from '@/lib/geo';
import type {
  RoutineTripResponse,
  RoutineWaypointResponse,
  CreateRoutineSubscriptionRequest,
  RoutineSubscriptionResponse,
} from '@/types/api';

// ── Geometry helpers ──

function pointToSegmentDistanceMeters(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const abLat = bLat - aLat;
  const abLng = bLng - aLng;
  const ab2 = abLat * abLat + abLng * abLng;
  if (ab2 === 0) return haversineMeters(pLat, pLng, aLat, aLng);
  const apLat = pLat - aLat;
  const apLng = pLng - aLng;
  const t = Math.max(0, Math.min(1, (apLat * abLat + apLng * abLng) / ab2));
  return haversineMeters(pLat, pLng, aLat + t * abLat, aLng + t * abLng);
}

function minDistanceToPolyline(
  lat: number,
  lng: number,
  coords: [number, number][], // [lat, lng] — backend format (not GeoJSON)
): number {
  if (coords.length === 0) return Infinity;
  if (coords.length === 1)
    return haversineMeters(lat, lng, coords[0][1], coords[0][0]);
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const [aLat, aLng] = coords[i];
    const [bLat, bLng] = coords[i + 1];
    const d = pointToSegmentDistanceMeters(lat, lng, aLat, aLng, bLat, bLng);
    if (d < min) min = d;
  }
  return min;
}

// ── Types ──

export interface DeviationPreview {
  deviationMeters: number;
  timeOverheadSeconds: number;
  isValid: boolean;
}

export interface UseRoutineSubscriptionHook {
  routineTrip: RoutineTripResponse | null;
  waypoints: RoutineWaypointResponse[];
  formData: Partial<CreateRoutineSubscriptionRequest>;
  updateForm: (fields: Partial<CreateRoutineSubscriptionRequest>) => void;
  previewDeviation: (lat: number, lng: number) => DeviationPreview;
  submit: () => Promise<RoutineSubscriptionResponse>;
  isLoading: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;
  loadingError: string | null;
}

// ── Hook ──

export function useRoutineSubscription(routineTripId: string): UseRoutineSubscriptionHook {
  const [routineTrip, setRoutineTrip] = useState<RoutineTripResponse | null>(null);
  const [waypoints, setWaypoints] = useState<RoutineWaypointResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Partial<CreateRoutineSubscriptionRequest>>({
    routineTripId,
    seatsRequired: 1,
    subscribedDays: [],
  });

  // Load trip and waypoints on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadingError(null);
      try {
        const [tripRes, wpRes] = await Promise.all([
          routineTripsApi.getById(routineTripId),
          routineTripsApi.getWaypoints(routineTripId),
        ]);
        if (!cancelled) {
          setRoutineTrip(tripRes.data.data);
          setWaypoints(wpRes.data.data ?? []);
        }
      } catch (err) {
        if (!cancelled)
          setLoadingError(extractApiError(err, 'Error al cargar la ruta rutinaria'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routineTripId]);

  const updateForm = useCallback((fields: Partial<CreateRoutineSubscriptionRequest>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
    // Clear field-level errors when form changes
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(fields).forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  const previewDeviation = useCallback(
    (lat: number, lng: number): DeviationPreview => {
      // Build effective route coordinates from routeLine (GeoJSON format: [lng, lat]) or origin→destination
      let coords: [number, number][] = [];
      if (routineTrip) {
        if (Array.isArray(routineTrip.routeLine) && routineTrip.routeLine.length >= 2) {
          coords = routineTrip.routeLine;
        } else {
          // Fallback: straight line origin → destination
          coords = [
            [routineTrip.originLongitude, routineTrip.originLatitude],
            [routineTrip.destinationLongitude, routineTrip.destinationLatitude],
          ];
        }
      }

      const deviationMeters =
        coords.length >= 2 ? Math.round(minDistanceToPolyline(lat, lng, coords)) : 0;
      // Backend formula: overhead = (deviation * 2) / 8.33 seconds
      const timeOverheadSeconds = Math.round((deviationMeters * 2) / 8.33);
      const maxDev = routineTrip?.maxPickupDeviationMeters ?? 500;
      const maxTime = routineTrip?.maxTimeOverheadSeconds ?? 300;

      return {
        deviationMeters,
        timeOverheadSeconds,
        isValid: deviationMeters <= maxDev && timeOverheadSeconds <= maxTime,
      };
    },
    [routineTrip],
  );

  const submit = useCallback(async (): Promise<RoutineSubscriptionResponse> => {
    // Client-side validation
    const errs: Record<string, string> = {};
    if (!formData.subscribedDays?.length)
      errs.subscribedDays = 'Selecciona al menos un día';
    if (!formData.startDate)
      errs.startDate = 'Selecciona la fecha de inicio de la suscripción';
    if (Object.keys(errs).length) {
      setErrors(errs);
      throw new Error('Completa los campos requeridos');
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      const response = await routineSubscriptionsApi.create(
        formData as CreateRoutineSubscriptionRequest,
      );
      return response.data.data!;
    } catch (err) {
      const apiErr = err as Record<string, unknown>;
      const statusCode = (apiErr?.response as Record<string, unknown>)?.status as number | undefined;
      const responseData = (apiErr?.response as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const code = responseData?.code as string | undefined;
      const message = (responseData?.message as string | undefined) ?? '';

      if (statusCode === 403 || code === 'STUDENT_VERIFICATION_REQUIRED') {
        setErrors({ global: 'STUDENT_VERIFICATION_REQUIRED' });
      } else if (code === 'PICKUP_TOO_FAR' || message.includes('PICKUP_TOO_FAR')) {
        setErrors({
          pickup: `Tu punto está demasiado lejos de la ruta (máximo: ${routineTrip?.maxPickupDeviationMeters ?? 500}m)`,
        });
      } else if (
        code === 'PICKUP_TIME_OVERHEAD_EXCEEDED' ||
        message.includes('PICKUP_TIME_OVERHEAD_EXCEEDED')
      ) {
        const maxMin = Math.round((routineTrip?.maxTimeOverheadSeconds ?? 300) / 60);
        setErrors({
          pickup: `El desvío agregaría demasiado tiempo al trayecto (máximo: ${maxMin} min)`,
        });
      } else if (code === 'NO_SEATS_AVAILABLE' || message.includes('NO_SEATS_AVAILABLE')) {
        setErrors({ subscribedDays: 'Sin cupos disponibles para algunos días seleccionados' });
      } else if (
        code === 'DUPLICATE_ACTIVE_SUBSCRIPTION' ||
        message.includes('DUPLICATE_ACTIVE_SUBSCRIPTION')
      ) {
        setErrors({ global: 'DUPLICATE_SUBSCRIPTION' });
      } else {
        setErrors({ global: extractApiError(err, 'Error al enviar la solicitud') });
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, routineTrip]);

  return {
    routineTrip,
    waypoints,
    formData,
    updateForm,
    previewDeviation,
    submit,
    isLoading,
    isSubmitting,
    errors,
    loadingError,
  };
}
