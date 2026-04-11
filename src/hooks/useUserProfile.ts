import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi } from '@/api/users';
import { ratingsApi } from '@/api/ratings';
import { extractApiError } from '@/lib/utils';
import type { UserResponse, RatingResponse } from '@/types/api';

export function useUserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [ratings, setRatings] = useState<RatingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, ratingsRes] = await Promise.all([
        usersApi.getById(id),
        ratingsApi.getByUser(id),
      ]);
      if (userRes.data.data) setUser(userRes.data.data);
      const rawRatings = ratingsRes.data.data;
      setRatings(Array.isArray(rawRatings) ? rawRatings : []);
    } catch (err) {
      setError(extractApiError(err, 'No se pudo cargar el perfil'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const avgScore = useMemo(
    () => ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
      : null,
    [ratings],
  );

  const withComment = useMemo(() => ratings.filter((r) => r.comment), [ratings]);

  const goBack = useCallback(() => router.back(), [router]);

  return {
    user,
    ratings,
    loading,
    error,
    insets,
    avgScore,
    withComment,
    load,
    goBack,
  };
}
