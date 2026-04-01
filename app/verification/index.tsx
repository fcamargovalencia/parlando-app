import React, { useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, Plus } from 'lucide-react-native';
import { Screen, EmptyState, Spinner } from '@/components/ui';
import { VerificationCard } from '@/components/VerificationCard';
import { useVerifications } from '@/hooks/useVerifications';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/colors';
import { getVerificationLevelLabel } from '@/lib/utils';
import type { IdentityVerificationResponse } from '@/types/api';

export default function VerificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { verifications, loading, fetchVerifications } = useVerifications();

  useFocusEffect(
    useCallback(() => {
      fetchVerifications();
    }, [fetchVerifications]),
  );

  const renderItem = ({ item }: { item: IdentityVerificationResponse; }) => (
    <View className="px-6 mb-3">
      <VerificationCard verification={item} />
    </View>
  );

  return (
    <Screen safe={false}>
      {/* Verification Level Banner */}
      <View className="mx-6 mt-4 mb-2 bg-primary-50 rounded-2xl px-4 py-3 flex-row items-center">
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

      {loading && verifications.length === 0 ? (
        <Spinner fullScreen message="Cargando verificaciones..." />
      ) : (
        <FlatList
          data={verifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerClassName="pt-4 pb-32"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchVerifications}
              tintColor={Colors.primary[600]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<ShieldCheck size={48} color={Colors.neutral[300]} />}
              title="Sin verificaciones"
              description="Verifica tu identidad para aumentar la confianza en tu perfil y acceder a más funciones."
              actionLabel="Verificar ahora"
              onAction={() => router.push('/verification/submit')}
            />
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={() => router.push('/verification/submit')}
        className="absolute right-6 w-14 h-14 rounded-full bg-primary-600 items-center justify-center"
        style={{
          bottom: Math.max(insets.bottom, 16) + 8,
          shadowColor: Colors.primary[900],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        activeOpacity={0.8}
      >
        <Plus size={26} color="white" />
      </TouchableOpacity>
    </Screen>
  );
}
