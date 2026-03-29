import { useReducer, useCallback, useEffect } from 'react';
import { vehiclesApi } from '@/api/vehicles';
import type { VehicleResponse, CreateVehicleRequest, UpdateVehicleRequest } from '@/types/api';

// ── State & Actions ──

interface VehiclesState {
  vehicles: VehicleResponse[];
  selected: VehicleResponse | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

type VehiclesAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: VehicleResponse[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SELECT'; payload: VehicleResponse }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; payload: VehicleResponse }
  | { type: 'UPDATE_SUCCESS'; payload: VehicleResponse }
  | { type: 'DELETE_SUCCESS'; payload: string }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

function vehiclesReducer(state: VehiclesState, action: VehiclesAction): VehiclesState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, vehicles: action.payload, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SELECT':
      return { ...state, selected: action.payload };
    case 'SUBMIT_START':
      return { ...state, submitting: true, error: null };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        submitting: false,
        vehicles: [...state.vehicles, action.payload],
        error: null,
      };
    case 'UPDATE_SUCCESS':
      return {
        ...state,
        submitting: false,
        vehicles: state.vehicles.map((v) =>
          v.id === action.payload.id ? action.payload : v,
        ),
        selected: action.payload,
        error: null,
      };
    case 'DELETE_SUCCESS':
      return {
        ...state,
        submitting: false,
        vehicles: state.vehicles.filter((v) => v.id !== action.payload),
        selected: null,
        error: null,
      };
    case 'SUBMIT_ERROR':
      return { ...state, submitting: false, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
  }
}

export function useVehicles() {
  const [state, dispatch] = useReducer(vehiclesReducer, {
    vehicles: [],
    selected: null,
    loading: false,
    submitting: false,
    error: null,
  });

  const fetchVehicles = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const { data: res } = await vehiclesApi.getMine();
      dispatch({ type: 'FETCH_SUCCESS', payload: res.data ?? [] });
    } catch (err: any) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: err?.response?.data?.message ?? 'Error al cargar vehículos',
      });
    }
  }, []);

  const fetchVehicle = useCallback(async (id: string) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const { data: res } = await vehiclesApi.getById(id);
      if (res.data) dispatch({ type: 'SELECT', payload: res.data });
    } catch (err: any) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: err?.response?.data?.message ?? 'Error al cargar vehículo',
      });
    }
  }, []);

  const createVehicle = useCallback(async (data: CreateVehicleRequest) => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const { data: res } = await vehiclesApi.create(data);
      if (!res.data) throw new Error('Error al registrar vehículo');
      dispatch({ type: 'SUBMIT_SUCCESS', payload: res.data });
      return true;
    } catch (err: any) {
      dispatch({
        type: 'SUBMIT_ERROR',
        payload: err?.response?.data?.message ?? 'Error al registrar vehículo',
      });
      return false;
    }
  }, []);

  const updateVehicle = useCallback(async (id: string, data: UpdateVehicleRequest) => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const { data: res } = await vehiclesApi.update(id, data);
      if (!res.data) throw new Error('Error al actualizar vehículo');
      dispatch({ type: 'UPDATE_SUCCESS', payload: res.data });
      return true;
    } catch (err: any) {
      dispatch({
        type: 'SUBMIT_ERROR',
        payload: err?.response?.data?.message ?? 'Error al actualizar vehículo',
      });
      return false;
    }
  }, []);

  const deleteVehicle = useCallback(async (id: string) => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      await vehiclesApi.remove(id);
      dispatch({ type: 'DELETE_SUCCESS', payload: id });
      return true;
    } catch (err: any) {
      dispatch({
        type: 'SUBMIT_ERROR',
        payload: err?.response?.data?.message ?? 'Error al eliminar vehículo',
      });
      return false;
    }
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return {
    ...state,
    fetchVehicles,
    fetchVehicle,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    clearError,
  };
}
