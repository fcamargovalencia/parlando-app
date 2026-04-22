import { useState, useCallback } from 'react';
import { routineTripsApi } from '@/api/routine-trips';
import type { SearchRoutineTripsParams, RoutineTripSearchResult } from '@/types/api';

type ParamsUpdater =
  | Partial<SearchRoutineTripsParams>
  | ((prev: Partial<SearchRoutineTripsParams>) => Partial<SearchRoutineTripsParams>);

interface UseSearchRoutineTripsHook {
  params: Partial<SearchRoutineTripsParams>;
  setParams: (p: ParamsUpdater) => void;
  results: RoutineTripSearchResult[];
  isLoading: boolean;
  error: string | null;
  search: () => Promise<void>;
  hasSearched: boolean;
}

export function useSearchRoutineTrips(): UseSearchRoutineTripsHook {
  const [params, setParamsRaw] = useState<Partial<SearchRoutineTripsParams>>({});
  const [results, setResults] = useState<RoutineTripSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const setParams = useCallback((updater: ParamsUpdater) => {
    if (typeof updater === 'function') {
      setParamsRaw((prev) => updater(prev));
    } else {
      setParamsRaw(updater);
    }
  }, []);

  const search = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await routineTripsApi.search(params as SearchRoutineTripsParams);
      setResults(response.data.data ?? []);
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
