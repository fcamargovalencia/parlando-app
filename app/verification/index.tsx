import React, { useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ShieldCheck, GraduationCap, Plus } from 'lucide-react-native';
import { Screen, EmptyState, Spinner } from '@/components/ui';
import { VerificationCard } from '@/components/VerificationCard';
import { StudentVerificationCard } from '@/components/student/StudentVerificationCard';
import { useVerifications } from '@/hooks/useVerifications';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/colors';
import { getVerificationLevelLabel } from '@/lib/utils';
import type { IdentityVerificationResponse, StudentVerificationResponse } from '@/types/api';

export default function VerificationsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    verifications,
    initialized,
    loading,
    refreshing,
    error,
    fetchVerifications,
  } = useVerifications();
  const {
    verifications: studentVerifications,
    isLoading: studentLoading,
    error: studentError,
    fetch: fetchStudentVerifications,
  } = useStudentVerification();

  useFocusEffect(
    useCallback(() => {
      void fetchVerifications({ silent: initialized });
      void fetchStudentVerifications();
    }, [fetchVerifications, fetchStudentVerifications, initialized]),
  );

  const handleRefresh = useCallback(() => {
    void fetchVerifications();
    void fetchStudentVerifications();
  }, [fetchVerifications, fetchStudentVerifications]);

  const isRefreshing = refreshing || studentLoading;
  const initialLoading = (loading && !initialized) || (studentLoading && studentVerifications.length === 0);

  return (
    <Screen safe={false}>
      {initialLoading ? (
        <Spinner fullScreen message="Cargando verificaciones..." />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary[600]}
            />
          }
        >
          {/* Verification Level Banner */}
          <View className="mx-6 mt-4 mb-5 bg-primary-50 rounded-2xl px-4 py-3 flex-row items-center">
            <View className="w-10 h-10 rounded-xl bg-primary-100 items-center justify-center mr-3">
              <ShieldCheck size={22} color={Colors.primary[600]} />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-primary-700 font-medium">Nivel de verificación</Text>
              <Text className="text-base font-bold text-primary-800">
                {user?.verificationLevel
                  ? getVerificationLevelLabel(user.verificationLevel)
                  : 'Sin verificar'}
              </Text>
            </View>
          </View>

          {/* ── Identity section ── */}
          <View className="flex-row items-center justify-between px-6 mb-3">
            <Text className="text-base font-bold text-neutral-900">Identidad</Text>
            <TouchableOpacity
              onPress={() => router.push('/verification/submit')}
              className="flex-row items-center gap-1.5"
              activeOpacity={0.7}
            >
              <Plus size={16} color={Colors.primary[600]} />
              <Text className="text-sm font-semibold text-primary-600">Agregar</Text>
            </TouchableOpacity>
          </View>

          {error && verifications.length === 0 ? (
            <View className="px-6 mb-6">
              <Text className="text-sm text-neutral-500">{error}</Text>
            </View>
          ) : verifications.length === 0 ? (
            <View className="px-6 mb-6">
              <EmptyState
                icon={<ShieldCheck size={40} color={Colors.neutral[300]} />}
                title="Sin verificaciones de identidad"
                description="Verifica tu identidad para aumentar la confianza en tu perfil."
                actionLabel="Verificar ahora"
                onAction={() => router.push('/verification/submit')}
              />
            </View>
          ) : (
            <View className="mb-6">
              {verifications.map((item: IdentityVerificationResponse) => (
                <View key={item.id} className="px-6 mb-3">
                  <VerificationCard verification={item} />
                </View>
              ))}
            </View>
          )}

          {/* ── Student section ── */}
          <View className="flex-row items-center justify-between px-6 mb-3">
            <Text className="text-base font-bold text-neutral-900">Estudiante</Text>
            <TouchableOpacity
              onPress={() => router.push('/student-verification/submit')}
              className="flex-row items-center gap-1.5"
              activeOpacity={0.7}
            >
              <Plus size={16} color={Colors.primary[600]} />
              <Text className="text-sm font-semibold text-primary-600">Agregar</Text>
            </TouchableOpacity>
          </View>

          {studentError && studentVerifications.length === 0 ? (
            <View className="px-6">
              <Text className="text-sm text-neutral-500">{studentError}</Text>
            </View>
          ) : studentVerifications.length === 0 ? (
            <View className="px-6">
              <EmptyState
                icon={<GraduationCap size={40} color={Colors.neutral[300]} />}
                title="Sin verificaciones estudiantiles"
                description="Agrega tu verificación para acceder a rutas exclusivas para estudiantes."
                actionLabel="Agregar verificación"
                onAction={() => router.push('/student-verification/submit')}
              />
            </View>
          ) : (
            <View>
              {studentVerifications.map((item: StudentVerificationResponse) => (
                <View key={item.id} className="px-6 mb-1">
                  <StudentVerificationCard
                    verification={item}
                    onRenew={
                      item.status === 'EXPIRED'
                        ? () => router.push({ pathname: '/student-verification/submit', params: { universityId: item.universityId } })
                        : undefined
                    }
                    onRetry={
                      item.status === 'REJECTED'
                        ? () => router.push({ pathname: '/student-verification/submit', params: { universityId: item.universityId } })
                        : undefined
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
