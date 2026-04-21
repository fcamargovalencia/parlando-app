import { useState, useCallback } from 'react';
import { routineTripsApi } from '@/api/routine-trips';
import type { SearchRoutineTripsParams, RoutineTripSearchResult } from '@/types/api';

interface UseSearchRoutineTripsHook {
  params: Partial<SearchRoutineTripsParams>;
  setParams: (p: Partial<SearchRoutineTripsParams>) => void;
  results: RoutineTripSearchResult[];
  isLoading: boolean;
  error: string | null;
  search: () => Promise<void>;
  hasSearched: boolean;
}

export function useSearchRoutineTrips(): UseSearchRoutineTripsHook {
  const [params, setParams] = useState<Partial<SearchRoutineTripsParams>>({});
  const [results, setResults] = useState<RoutineTripSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await routineTripsApi.search(params as SearchRoutineTripsParams);
      setResults(response.data.data?.content ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al buscar rutas rutinarias';
      setError(message);
      setResults([]);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  }, [params]);

  return {
    params,
    setParams,
    results,
    isLoading,
    error,
    search,
    hasSearched,
  };
}
