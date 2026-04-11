import { useReducer, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { vehiclesApi } from '@/api/vehicles';
import { tripsApi } from '@/api/trips';
import { tomtomService } from '@/lib/tomtom';
import { distanceKm, normalizePlace, compactPolyline, extractApiError } from '@/lib/utils';
import type { TripType, VehicleResponse, WaypointRequest } from '@/types/api';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import type { RouteAlternative } from './useRouteAlternatives';
import Toast from 'react-native-toast-message';

// ── Form state ──

export interface PublishForm {
  origin: SelectedLocation | null;
  destination: SelectedLocation | null;
  departureAt: Date;
  availableSeats: string;
  pricePerSeat: string;
  vehicleId: string;
  allowsLuggage: boolean;
  studentsOnly: boolean;
}

/**
 * Internal reducer state extends PublishForm with vehicle-loading fields so
 * both the form values and the vehicle list are managed atomically.
 * The public `form` exposed by the hook is just the PublishForm subset.
 */
interface PublishInternalState extends PublishForm {
  vehicles: VehicleResponse[];
  loadingVehicles: boolean;
}

export type PublishAction =
  | { type: 'SET_ORIGIN'; payload: SelectedLocation; }
  | { type: 'SET_DESTINATION'; payload: SelectedLocation; }
  | { type: 'SET_DEPARTURE'; payload: Date; }
  | { type: 'SET_SEATS'; payload: string; }
  | { type: 'SET_PRICE'; payload: string; }
  | { type: 'SET_VEHICLE'; payload: string; }
  | { type: 'TOGGLE_LUGGAGE'; }
  | { type: 'TOGGLE_STUDENTS'; }
  | { type: 'RESET'; }
  | { type: 'VEHICLES_LOAD_START'; }
  | { type: 'VEHICLES_LOAD_SUCCESS'; payload: VehicleResponse[]; };

function makeTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

const initialForm: PublishForm = {
  origin: null,
  destination: null,
  departureAt: makeTomorrow(),
  availableSeats: '3',
  pricePerSeat: '',
  vehicleId: '',
  allowsLuggage: true,
  studentsOnly: false,
};

const initialInternalState: PublishInternalState = {
  ...initialForm,
  vehicles: [],
  loadingVehicles: false,
};

function formReducer(state: PublishInternalState, action: PublishAction): PublishInternalState {
  switch (action.type) {
    case 'SET_ORIGIN':       return { ...state, origin: action.payload };
    case 'SET_DESTINATION':  return { ...state, destination: action.payload };
    case 'SET_DEPARTURE':    return { ...state, departureAt: action.payload };
    case 'SET_SEATS':        return { ...state, availableSeats: action.payload };
    case 'SET_PRICE':        return { ...state, pricePerSeat: action.payload };
    case 'SET_VEHICLE':      return { ...state, vehicleId: action.payload };
    case 'TOGGLE_LUGGAGE':   return { ...state, allowsLuggage: !state.allowsLuggage };
    case 'TOGGLE_STUDENTS':  return { ...state, studentsOnly: !state.studentsOnly };
    // Preserve the vehicle list on reset so it doesn't flash on re-publish
    case 'RESET':
      return { ...initialForm, departureAt: makeTomorrow(), vehicles: state.vehicles, loadingVehicles: state.loadingVehicles };
    case 'VEHICLES_LOAD_START':
      return { ...state, loadingVehicles: true };
    case 'VEHICLES_LOAD_SUCCESS':
      return { ...state, vehicles: action.payload, loadingVehicles: false };
  }
}

// ── Helpers ──

function isVehicleActive(status: string | undefined) {
  return (status ?? '').toUpperCase() === 'ACTIVE';
}

export function locationSubtitle(loc: SelectedLocation): string {
  return [loc.city, loc.state, loc.country].filter(Boolean).join(', ');
}

// ── Validation ──

export function isStepValid(
  step: number,
  form: PublishForm,
  routeAlternatives: RouteAlternative[],
  selectedRouteId: string,
): boolean {
  if (step === 2) return !!form.origin;
  if (step === 3) {
    if (!form.origin || !form.destination) return false;
    const sameCity = normalizePlace(form.origin.name) === normalizePlace(form.destination.name);
    const near = distanceKm(form.origin, form.destination) < 1;
    return !sameCity && !near;
  }
  if (step === 4) return true;
  if (step === 5) return routeAlternatives.length > 0 && !!selectedRouteId;
  if (step === 6) return form.departureAt > new Date();
  if (step === 7) {
    return (
      !!form.availableSeats &&
      parseInt(form.availableSeats, 10) > 0 &&
      !!form.pricePerSeat &&
      parseInt(form.pricePerSeat, 10) > 0
    );
  }
  if (step === 8) return !!form.vehicleId;
  return true;
}

export const STEP_VALIDATION_MESSAGES: Record<number, { title: string; message: string; }> = {
  2: { title: 'Falta el origen', message: 'Selecciona el lugar de origen.' },
  3: { title: 'Destino inválido', message: 'El destino no puede ser la misma ciudad de origen.' },
  5: { title: 'Ruta requerida', message: 'Selecciona una alternativa de ruta en el mapa.' },
  6: { title: 'Fecha inválida', message: 'Selecciona una fecha y hora futura.' },
  7: { title: 'Datos incompletos', message: 'Completa asientos y precio.' },
  8: { title: 'Vehículo requerido', message: 'Selecciona el vehículo para este viaje.' },
};

// ── Hook ──

export function usePublishForm() {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripType>('INTERCITY');
  const [internalState, dispatch] = useReducer(formReducer, initialInternalState);
  const [waypoints, setWaypoints] = useState<SelectedLocation[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Destructure: form fields (public) vs vehicle loading (internal)
  const { vehicles, loadingVehicles, ...form } = internalState;

  const loadVehicles = useCallback(async () => {
    dispatch({ type: 'VEHICLES_LOAD_START' });
    try {
      const { data: res } = await vehiclesApi.getMine();
      dispatch({ type: 'VEHICLES_LOAD_SUCCESS', payload: res.data ?? [] });
    } catch {
      dispatch({ type: 'VEHICLES_LOAD_SUCCESS', payload: [] });
    }
  }, []);

  useFocusEffect(useCallback(() => { loadVehicles(); }, [loadVehicles]));

  // Auto-select if only one active vehicle
  useEffect(() => {
    const active = vehicles.filter((v) => v.status === 'ACTIVE');
    if (active.length === 1 && !form.vehicleId) {
      dispatch({ type: 'SET_VEHICLE', payload: active[0].id });
    }
  }, [vehicles, form.vehicleId]);

  const activeVehicles = vehicles.filter((v) => isVehicleActive(v.status));
  const vehicleOptions = [...vehicles].sort((a, b) => {
    const aActive = isVehicleActive(a.status) ? 1 : 0;
    const bActive = isVehicleActive(b.status) ? 1 : 0;
    return bActive - aActive;
  });
  const selectedVehicle = vehicleOptions.find((v) => v.id === form.vehicleId) ?? null;

  // Clear invalid vehicle selection
  useEffect(() => {
    if (form.vehicleId && !activeVehicles.some((v) => v.id === form.vehicleId)) {
      dispatch({ type: 'SET_VEHICLE', payload: '' });
    }
  }, [form.vehicleId, activeVehicles]);

  // Submit
  const handlePublish = useCallback(
    async (selectedRoute: RouteAlternative | null, onSuccess?: () => void) => {
      if (!form.origin || !form.destination) {
        Alert.alert('Campos requeridos', 'Selecciona el origen y destino del viaje');
        return;
      }
      if (!form.vehicleId) {
        Alert.alert('Campos requeridos', 'Selecciona un vehículo para el viaje');
        return;
      }
      if (!form.pricePerSeat || parseInt(form.pricePerSeat) <= 0) {
        Alert.alert('Campos requeridos', 'Ingresa el precio por asiento');
        return;
      }
      if (!form.availableSeats || parseInt(form.availableSeats, 10) <= 0) {
        Alert.alert('Campos requeridos', 'Ingresa la cantidad de asientos disponibles');
        return;
      }
      if (form.departureAt <= new Date()) {
        Alert.alert('Fecha inválida', 'La fecha de salida debe ser en el futuro');
        return;
      }

      setSubmitting(true);
      try {
        const routeWaypoints: WaypointRequest[] = waypoints.map((w, idx) => ({
          latitude: w.latitude,
          longitude: w.longitude,
          orderIndex: idx,
          name: w.name,
          subtitle: locationSubtitle(w) || undefined,
          isPickupPoint: true,
        }));
        let travelTimeInSeconds: number | null = selectedRoute?.travelTimeInSeconds ?? null;

        try {
          const stops = [
            { latitude: form.origin.latitude, longitude: form.origin.longitude },
            ...waypoints.map((w) => ({ latitude: w.latitude, longitude: w.longitude })),
            { latitude: form.destination.latitude, longitude: form.destination.longitude },
          ];
          const { travelTimeInSeconds: routeDuration } = await tomtomService.calculateRoute(stops);
          if (travelTimeInSeconds === null) travelTimeInSeconds = routeDuration;
        } catch (routeErr) {
          console.warn('[TomTom] Route calculation failed, using estimated trip duration only from selected route:', routeErr);
        }

        const arrivedAt =
          travelTimeInSeconds !== null
            ? new Date(form.departureAt.getTime() + travelTimeInSeconds * 1000).toISOString()
            : undefined;

        const routePolyline = selectedRoute?.points
          ? compactPolyline(selectedRoute.points, 300)
          : [];

        const createTripBody = {
          tripType,
          originName: form.origin.name,
          originSubtitle: locationSubtitle(form.origin) || undefined,
          originLatitude: form.origin.latitude,
          originLongitude: form.origin.longitude,
          destinationName: form.destination.name,
          destinationSubtitle: locationSubtitle(form.destination) || undefined,
          destinationLatitude: form.destination.latitude,
          destinationLongitude: form.destination.longitude,
          departureAt: form.departureAt.toISOString(),
          arrivedAt,
          availableSeats: parseInt(form.availableSeats, 10),
          pricePerSeat: parseFloat(form.pricePerSeat),
          currency: 'COP',
          vehicleId: form.vehicleId,
          allowsLuggage: form.allowsLuggage,
          studentsOnly: tripType === 'ROUTINE' ? form.studentsOnly : false,
          waypoints: routeWaypoints,
          routePolyline,
        };
        const { data: createRes } = await tripsApi.create(createTripBody);

        if (!createRes.data) throw new Error('Error al crear viaje');
        await tripsApi.publish(createRes.data.id);

        Toast.show({
          type: 'success',
          text1: '¡Viaje publicado!',
          text2: 'Tu viaje ya es visible para pasajeros',
        });

        dispatch({ type: 'RESET' });
        setWaypoints([]);
        onSuccess?.();
        router.push('/(tabs)/my-trips');
      } catch (err) {
        Alert.alert('Error al publicar', extractApiError(err, 'No se pudo publicar el viaje. Intenta nuevamente.'));
      } finally {
        setSubmitting(false);
      }
    },
    [form, tripType, waypoints, router],
  );

  return {
    tripType,
    setTripType,
    form,
    dispatch,
    waypoints,
    setWaypoints,
    submitting,
    vehicles,
    loadingVehicles,
    activeVehicles,
    vehicleOptions,
    selectedVehicle,
    hasRegisteredVehicles: vehicles.length > 0,
    handlePublish,
  };
}
