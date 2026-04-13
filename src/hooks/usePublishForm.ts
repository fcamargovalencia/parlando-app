import { useReducer, useState, useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { vehiclesApi } from '@/api/vehicles';
import { distanceKm, normalizePlace } from '@/lib/utils';
import type { TripType, VehicleResponse } from '@/types/api';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import type { RouteAlternative } from './useRouteAlternatives';

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
  const [tripType, setTripType] = useState<TripType>('INTERCITY');
  const [internalState, dispatch] = useReducer(formReducer, initialInternalState);
  const [waypoints, setWaypoints] = useState<SelectedLocation[]>([]);

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

  const activeVehicles = useMemo(
    () => vehicles.filter((v) => isVehicleActive(v.status)),
    [vehicles],
  );
  const vehicleOptions = useMemo(
    () => [...vehicles].sort((a, b) =>
      (isVehicleActive(b.status) ? 1 : 0) - (isVehicleActive(a.status) ? 1 : 0),
    ),
    [vehicles],
  );
  const selectedVehicle = useMemo(
    () => vehicleOptions.find((v) => v.id === form.vehicleId) ?? null,
    [vehicleOptions, form.vehicleId],
  );

  // Clear invalid vehicle selection
  useEffect(() => {
    if (form.vehicleId && !activeVehicles.some((v) => v.id === form.vehicleId)) {
      dispatch({ type: 'SET_VEHICLE', payload: '' });
    }
  }, [form.vehicleId, activeVehicles]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    setWaypoints([]);
  }, []);

  return {
    tripType,
    setTripType,
    form,
    dispatch,
    waypoints,
    setWaypoints,
    vehicles,
    loadingVehicles,
    activeVehicles,
    vehicleOptions,
    selectedVehicle,
    hasRegisteredVehicles: vehicles.length > 0,
    reset,
  };
}
