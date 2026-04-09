import { useCallback, useEffect, useReducer } from 'react';
import { tripsApi } from '@/api/trips';
import type { TripResponse, TripType } from '@/types/api';

// ── Config ──

const PAGE_SIZE = 10;
const RADIUS_KM = 15;

// ── Input ──

export interface SearchResultsParams {
  originLat: string;
  originLng: string;
  destLat: string;
  destLng: string;
  departureFrom: string;
  departureTo: string;
  tripType?: string;
}

// ── State / reducer ──

interface State {
  trips: TripResponse[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}

type Action =
  | { type: 'LOAD_START'; }
  | { type: 'REFRESH_START'; }
  | { type: 'LOAD_MORE_START'; }
  | { type: 'PAGE_SUCCESS'; trips: TripResponse[]; page: number; last: boolean; replace: boolean; }
  | { type: 'ERROR'; payload: string; };

const initialState: State = {
  trips: [],
  loading: true,
  refreshing: false,
  loadingMore: false,
  error: null,
  page: 0,
  hasMore: true,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'REFRESH_START':
      return { ...state, refreshing: true, error: null };
    case 'LOAD_MORE_START':
      return { ...state, loadingMore: true };
    case 'PAGE_SUCCESS':
      return {
        ...state,
        loading: false,
        refreshing: false,
        loadingMore: false,
        trips: action.replace ? action.trips : [...state.trips, ...action.trips],
        page: action.page,
        hasMore: !action.last,
      };
    case 'ERROR':
      return {
        ...state,
        loading: false,
        refreshing: false,
        loadingMore: false,
        error: action.payload,
      };
  }
}

// ── Hook ──

/**
 * Handles trip search results with pagination, refresh, and load-more.
 * Input params are passed as primitives (not a new object reference per render)
 * so `useCallback`/`useEffect` deps remain stable.
 */
export function useSearchResults(params: SearchResultsParams) {
  const {
    originLat,
    originLng,
    destLat,
    destLng,
    departureFrom,
    departureTo,
    tripType,
  } = params;

  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchPage = useCallback(
    async (page: number, replace: boolean) => {
      try {
        const { data: res } = await tripsApi.search({
          originLat: parseFloat(originLat),
          originLng: parseFloat(originLng),
          destLat: parseFloat(destLat),
          destLng: parseFloat(destLng),
          departureFrom,
          departureTo,
          tripType: tripType as TripType | undefined,
          radiusKm: RADIUS_KM,
          page,
          size: PAGE_SIZE,
        });
        const result = res.data;
        if (!result) throw new Error('Sin datos');

        dispatch({
          type: 'PAGE_SUCCESS',
          trips: result.content,
          page,
          last: result.last,
          replace,
        });
      } catch (err: any) {
        dispatch({
          type: 'ERROR',
          payload: err?.response?.data?.message ?? 'No se pudo cargar la búsqueda',
        });
      }
    },
    [originLat, originLng, destLat, destLng, departureFrom, departureTo, tripType],
  );

  const load = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    await fetchPage(0, true);
  }, [fetchPage]);

  const refresh = useCallback(async () => {
    dispatch({ type: 'REFRESH_START' });
    await fetchPage(0, true);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (state.loadingMore || !state.hasMore || state.loading) return;
    dispatch({ type: 'LOAD_MORE_START' });
    await fetchPage(state.page + 1, false);
  }, [fetchPage, state.loadingMore, state.hasMore, state.loading, state.page]);

  useEffect(() => { void load(); }, [load]);

  return {
    trips: state.trips,
    loading: state.loading,
    refreshing: state.refreshing,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: state.hasMore,
    radiusKm: RADIUS_KM,
    load,
    refresh,
    loadMore,
  };
}
