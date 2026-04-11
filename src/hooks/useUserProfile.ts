import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi } from '@/api/users';
import { ratingsApi } from '@/api/ratings';
import { extractApiError } from '@/lib/utils';
import type { UserResponse, RatingResponse } from '@/types/api';

// ── State & Actions ──

interface UserProfileState {
  user: UserResponse | null;
  ratings: RatingResponse[];
  loading: boolean;
  error: string | null;
}

type UserProfileAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; user: UserResponse; ratings: RatingResponse[] }
  | { type: 'LOAD_ERROR'; error: string };

function userProfileReducer(
  state: UserProfileState,
  action: UserProfileAction,
): UserProfileState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_SUCCESS':
      return { user: action.user, ratings: action.ratings, loading: false, error: null };
    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.error };
  }
}

const initialState: UserProfileState = {
  user: null,
  ratings: [],
  loading: true,
  error: null,
};

// ── Hook ──

export function useUserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [state, dispatch] = useReducer(userProfileReducer, initialState);

  const load = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const [userRes, ratingsRes] = await Promise.all([
        usersApi.getById(id),
        ratingsApi.getByUser(id),
      ]);
      const user = userRes.data.data;
      const rawRatings = ratingsRes.data.data;
      if (!user) throw new Error('Usuario no encontrado');
      dispatch({
        type: 'LOAD_SUCCESS',
        user,
        ratings: Array.isArray(rawRatings) ? rawRatings : [],
      });
    } catch (err) {
      dispatch({ type: 'LOAD_ERROR', error: extractApiError(err, 'No se pudo cargar el perfil') });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const avgScore = useMemo(
    () =>
      state.ratings.length > 0
        ? state.ratings.reduce((sum, r) => sum + r.score, 0) / state.ratings.length
        : null,
    [state.ratings],
  );

  const withComment = useMemo(
    () => state.ratings.filter((r) => r.comment),
    [state.ratings],
  );

  const goBack = useCallback(() => router.back(), [router]);

  return {
    ...state,
    insets,
    avgScore,
    withComment,
    load,
    goBack,
  };
}
