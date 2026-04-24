import { useState, useCallback, useEffect } from 'react';
import { tripsApi } from '@/api/trips';
import type { TripResponse } from '@/types/api';

interface UseRoutineOccurrencesResult {
  occurrences: TripResponse[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  cancelOccurrence: (tripId: string) => Promise<void>;
}

export function useRoutineOccurrences(routineTripId: string): UseRoutineOccurrencesResult {
  const [occurrences, setOccurrences] = useState<TripResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!routineTripId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await tripsApi.getByRoutineTrip(routineTripId);
      setOccurrences(response.data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las ocurrencias');
    } finally {
      setIsLoading(false);
    }
  }, [routineTripId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const cancelOccurrence = useCallback(async (tripId: string) => {
    await tripsApi.cancel(tripId);
    setOccurrences((prev) => prev.filter((o) => o.id !== tripId));
  }, []);

  return { occurrences, isLoading, error, refetch, cancelOccurrence };
}
