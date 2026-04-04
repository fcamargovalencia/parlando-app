import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, MessageCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, Spinner } from '@/components/ui';
import { Colors, Shadows } from '@/constants/colors';
import { usersApi } from '@/api/users';
import { ratingsApi } from '@/api/ratings';
import type { UserResponse, RatingResponse } from '@/types/api';
import dayjs from 'dayjs';

// ── Star row ──

function StarRow({ score, size = 14 }: { score: number; size?: number }) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          color="#F59E0B"
          fill={s <= score ? '#F59E0B' : 'transparent'}
        />
      ))}
    </View>
  );
}

// ── Rating item ──

function RatingItem({ rating }: { rating: RatingResponse }) {
  return (
    <View className="py-3 border-b border-neutral-100">
      <View className="flex-row items-center justify-between mb-1.5">
        <StarRow score={rating.score} />
        <Text className="text-xs text-neutral-400">
          {dayjs(rating.createdAt).format('D MMM YYYY')}
        </Text>
      </View>
      {rating.comment ? (
        <Text className="text-sm text-neutral-700 leading-5">{rating.comment}</Text>
      ) : (
        <Text className="text-sm text-neutral-400 italic">Sin comentario</Text>
      )}
    </View>
  );
}

// ── Screen ──

export default function UserProfileScreen() {
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
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const avgScore = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    : null;

  const withComment = ratings.filter((r) => r.comment);

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <View
        className="flex-row items-center px-4 bg-white border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8, paddingBottom: 12, ...Shadows.sm }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center mr-2"
        >
          <ArrowLeft size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text className="text-base font-semibold text-neutral-900">Perfil</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : error || !user ? (
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Text className="text-sm text-neutral-500 text-center">
            {error ?? 'No encontrado'}
          </Text>
          <TouchableOpacity onPress={load}>
            <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}
        >
          {/* Profile card */}
          <Card>
            <View className="items-center py-2">
              <Avatar
                uri={user.profilePhotoUrl}
                firstName={user.firstName}
                lastName={user.lastName}
                size="xl"
              />
              <Text className="text-xl font-bold text-neutral-900 mt-3">
                {user.firstName} {user.lastName}
              </Text>

              {/* Score summary */}
              <View className="flex-row items-center gap-4 mt-3">
                <View className="items-center">
                  <View className="flex-row items-center gap-1.5 mb-0.5">
                    <Star size={18} color="#F59E0B" fill="#F59E0B" />
                    <Text className="text-xl font-bold text-neutral-900">
                      {user.trustScore.toFixed(1)}
                    </Text>
                  </View>
                  <Text className="text-xs text-neutral-400">Puntuación</Text>
                </View>

                <View className="w-px h-8 bg-neutral-200" />

                <View className="items-center">
                  <View className="flex-row items-center gap-1.5 mb-0.5">
                    <MessageCircle size={18} color={Colors.neutral[500]} />
                    <Text className="text-xl font-bold text-neutral-900">
                      {ratings.length}
                    </Text>
                  </View>
                  <Text className="text-xs text-neutral-400">
                    {ratings.length === 1 ? 'Calificación' : 'Calificaciones'}
                  </Text>
                </View>

                {avgScore !== null && (
                  <>
                    <View className="w-px h-8 bg-neutral-200" />
                    <View className="items-center">
                      <StarRow score={Math.round(avgScore)} size={16} />
                      <Text className="text-xs text-neutral-400 mt-0.5">
                        {avgScore.toFixed(1)} promedio
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Card>

          {/* Ratings list */}
          <Card>
            <View className="flex-row items-center gap-2 mb-1">
              <MessageCircle size={16} color={Colors.primary[600]} />
              <Text className="text-base font-semibold text-neutral-700">
                Comentarios
              </Text>
              {withComment.length > 0 && (
                <View className="ml-auto bg-primary-100 rounded-full px-2 py-0.5">
                  <Text className="text-xs font-bold text-primary-700">
                    {withComment.length}
                  </Text>
                </View>
              )}
            </View>

            {ratings.length === 0 ? (
              <View className="items-center py-8">
                <View className="w-14 h-14 rounded-full bg-neutral-100 items-center justify-center mb-3">
                  <MessageCircle size={28} color={Colors.neutral[300]} />
                </View>
                <Text className="text-sm font-medium text-neutral-600 mb-1">
                  Sin calificaciones aún
                </Text>
                <Text className="text-xs text-neutral-400 text-center px-4">
                  Las calificaciones aparecerán aquí después de completar viajes.
                </Text>
              </View>
            ) : (
              ratings.map((r) => <RatingItem key={r.id} rating={r} />)
            )}
          </Card>

          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      )}
    </View>
  );
}
