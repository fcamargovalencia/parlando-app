import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { GraduationCap, Plus } from 'lucide-react-native';
import { EmptyState, Spinner } from '@/components/ui';
import { StudentVerificationCard } from '@/components/student/StudentVerificationCard';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import { Colors } from '@/constants/colors';
import type { StudentVerificationResponse } from '@/types/api';

export default function StudentVerificationIndexScreen() {
  const router = useRouter();
  const { verifications, isLoading, error, fetch } = useStudentVerification();

  useFocusEffect(
    useCallback(() => {
      void fetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const handleRenew = useCallback(
    (universityId: string) => {
      router.push({
        pathname: '/student-verification/submit',
        params: { universityId },
      });
    },
    [router],
  );

  const handleRetry = useCallback(
    (universityId: string) => {
      router.push({
        pathname: '/student-verification/submit',
        params: { universityId },
      });
    },
    [router],
  );

  const renderItem = ({ item }: { item: StudentVerificationResponse; }) => (
    <View className="px-4 mb-1">
      <StudentVerificationCard
        verification={item}
        onRenew={
          item.status === 'EXPIRED'
            ? () => handleRenew(item.universityId)
            : undefined
        }
        onRetry={
          item.status === 'REJECTED'
            ? () => handleRetry(item.universityId)
            : undefined
        }
      />
    </View>
  );

  return (
    <View className="flex-1 bg-neutral-50">
      {isLoading && verifications.length === 0 ? (
        <Spinner fullScreen message="Cargando verificaciones..." />
      ) : error && verifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Text className="text-sm text-neutral-500 text-center">{error}</Text>
          <TouchableOpacity onPress={() => void fetch()}>
            <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={verifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && verifications.length > 0}
              onRefresh={() => void fetch()}
              tintColor={Colors.primary[600]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<GraduationCap size={40} color={Colors.neutral[300]} />}
              title="Sin verificaciones estudiantiles"
              description="Agrega tu verificación para acceder a rutas exclusivas para estudiantes."
              actionLabel="Agregar verificación"
              onAction={() => router.push('/student-verification/submit')}
            />
          }
          ListHeaderComponent={
            verifications.length > 0 ? (
              <View className="px-4 mb-4">
                <Text className="text-xs text-neutral-500 leading-4">
                  Tus verificaciones estudiantiles activas y pasadas. Una verificación aprobada
                  te permite acceder a rutas rutinarias exclusivas para estudiantes.
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/student-verification/submit')}
        activeOpacity={0.85}
        className="absolute bottom-8 right-5 w-14 h-14 rounded-full bg-primary-500 items-center justify-center shadow-lg"
        style={{ elevation: 6 }}
      >
        <Plus size={24} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}
