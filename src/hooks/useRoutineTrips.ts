import { useCallback } from 'react';
import { routineTripsApi } from '@/api/routine-trips';
import { useRoutineTripsStore } from '@/stores/routine-trips-store';
import type { RoutineTripResponse } from '@/types/api';

interface UseRoutineTripsResult {
  myTrips: RoutineTripResponse[];
  isLoading: boolean;
  refetch: () => void;
  pauseTrip: (id: string) => Promise<void>;
  resumeTrip: (id: string) => Promise<void>;
  cancelTrip: (id: string) => Promise<void>;
  publishTrip: (id: string) => Promise<void>;
}

export function useRoutineTrips(): UseRoutineTripsResult {
  const myRoutineTrips = useRoutineTripsStore((s) => s.myRoutineTrips);
  const isLoading = useRoutineTripsStore((s) => s.isLoading);
  const fetchMine = useRoutineTripsStore((s) => s.fetchMine);
  const updateInList = useRoutineTripsStore((s) => s.updateInList);
  const removeFromList = useRoutineTripsStore((s) => s.removeFromList);

  const refetch = useCallback(() => {
    fetchMine();
  }, [fetchMine]);

  const pauseTrip = useCallback(
    async (id: string) => {
      const response = await routineTripsApi.pause(id);
      const updated = response.data.data;
      if (updated) updateInList(updated);
    },
    [updateInList],
  );

  const resumeTrip = useCallback(
    async (id: string) => {
      const response = await routineTripsApi.resume(id);
      const updated = response.data.data;
      if (updated) updateInList(updated);
    },
    [updateInList],
  );

  const cancelTrip = useCallback(
    async (id: string) => {
      await routineTripsApi.cancel(id);
      removeFromList(id);
    },
    [removeFromList],
  );

  const publishTrip = useCallback(
    async (id: string) => {
      const response = await routineTripsApi.publish(id);
      const updated = response.data.data;
      if (updated) updateInList(updated);
    },
    [updateInList],
  );

  return {
    myTrips: myRoutineTrips,
    isLoading,
    refetch,
    pauseTrip,
    resumeTrip,
    cancelTrip,
    publishTrip,
  };
}
