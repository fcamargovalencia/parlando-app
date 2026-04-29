import { create } from 'zustand';
import { routineTripsApi } from '@/api/routine-trips';
import type {
  RoutineTripResponse,
  RoutineTripSearchResult,
  RoutineWaypointResponse,
} from '@/types/api';

interface RoutineTripsState {
  myRoutineTrips: RoutineTripResponse[];
  selectedRoutineTrip: RoutineTripResponse | null;
  waypoints: RoutineWaypointResponse[];
  searchResults: RoutineTripSearchResult[];
  isLoading: boolean;
  waypointsLoading: boolean;
  error: string | null;

  fetchMine: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  fetchWaypoints: (id: string) => Promise<void>;
  setSelected: (trip: RoutineTripResponse | null) => void;
  setSearchResults: (results: RoutineTripSearchResult[]) => void;
  clearSearch: () => void;
  updateInList: (trip: RoutineTripResponse) => void;
  removeFromList: (id: string) => void;
}

export const useRoutineTripsStore = create<RoutineTripsState>((set, get) => ({
  myRoutineTrips: [],
  selectedRoutineTrip: null,
  waypoints: [],
  searchResults: [],
  isLoading: false,
  waypointsLoading: false,
  error: null,

  fetchMine: async () => {
    // Only show a blocking spinner on first load; subsequent calls refresh silently.
    const hasData = get().myRoutineTrips.length > 0;
    set({ isLoading: !hasData, error: null });
    try {
      const response = await routineTripsApi.getMine();
      set({ myRoutineTrips: response.data.data ?? [] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar las rutas rutinarias';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchById: async (id: string) => {
    // Immediately show cached data if available — avoids blank spinner on navigation
    const cached = get().myRoutineTrips.find((t) => t.id === id);
    if (cached && get().selectedRoutineTrip?.id !== id) {
      set({ selectedRoutineTrip: cached });
    }
    set({ isLoading: true, error: null });
    try {
      const response = await routineTripsApi.getById(id);
      const trip = response.data.data;
      if (trip) {
        set({ selectedRoutineTrip: trip });
        get().updateInList(trip);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar la ruta';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWaypoints: async (id: string) => {
    set({ waypointsLoading: true });
    try {
      const response = await routineTripsApi.getWaypoints(id);
      set({ waypoints: response.data.data ?? [] });
    } catch {
      set({ waypoints: [] });
    } finally {
      set({ waypointsLoading: false });
    }
  },

  setSelected: (trip) => set({ selectedRoutineTrip: trip }),

  setSearchResults: (results) => set({ searchResults: results }),

  clearSearch: () => set({ searchResults: [] }),

  updateInList: (trip) =>
    set((state) => ({
      myRoutineTrips: state.myRoutineTrips.some((t) => t.id === trip.id)
        ? state.myRoutineTrips.map((t) => (t.id === trip.id ? trip : t))
        : [...state.myRoutineTrips, trip],
      selectedRoutineTrip:
        state.selectedRoutineTrip?.id === trip.id ? trip : state.selectedRoutineTrip,
    })),

  removeFromList: (id) =>
    set((state) => ({
      myRoutineTrips: state.myRoutineTrips.filter((t) => t.id !== id),
      selectedRoutineTrip:
        state.selectedRoutineTrip?.id === id ? null : state.selectedRoutineTrip,
    })),
}));
