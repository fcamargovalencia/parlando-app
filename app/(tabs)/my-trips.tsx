import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { Route } from 'lucide-react-native';
import { Screen, EmptyState, Spinner, FilterTabs } from '@/components/ui';
import { MyTripCard } from '@/components/trip/MyTripCard';
import { RateModal } from '@/components/trip/RateModal';
import { Colors } from '@/constants/colors';
import { useMyTrips } from '@/hooks/useMyTrips';
import type { MyTripFilter } from '@/types/my-trips';

// ── Filter tabs config ──

const FILTERS: { key: MyTripFilter; label: string; }[] = [
  { key: 'active', label: 'Activos' },
  { key: 'past', label: 'Pasados' },
  { key: 'cancelled', label: 'Cancelados' },
];

const EMPTY_COPY: Record<MyTripFilter, { title: string; description: string; action?: string; }> = {
  active: {
    title: 'Sin viajes activos',
    description: 'Publica un viaje como conductor o reserva uno como pasajero.',
    action: 'Buscar viaje',
  },
  past: {
    title: 'Sin viajes pasados',
    description: 'Aquí aparecerán tus viajes completados como conductor o pasajero.',
  },
  cancelled: {
    title: 'Sin viajes cancelados',
    description: 'Aquí aparecerán los viajes o reservas que hayas cancelado.',
  },
};

// ── Screen ──

export default function MyTripsScreen() {
  const router = useRouter();
  const {
    items,
    counts,
    filter,
    setFilter,
    loading,
    refreshing,
    error,
    cancellingId,
    refresh,
    reload,
    cancelItem,
    rateModal,
    openRateModal,
    closeRateModal,
    submitRating,
  } = useMyTrips();

  useFocusEffect(
    useCallback(() => {
      void reload(false);
    }, [reload]),
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-3xl font-bold text-neutral-900">Mis viajes</Text>
        <Text className="text-sm text-neutral-500 mt-1">
          Todos tus viajes como conductor o pasajero
        </Text>
      </View>

      {/* Filter tabs */}
      <FilterTabs
        tabs={FILTERS.map((f) => ({ key: f.key, label: f.label, count: counts[f.key] }))}
        active={filter}
        onSelect={setFilter}
      />

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-neutral-500 text-center mb-3">{error}</Text>
          <TouchableOpacity onPress={() => reload()}>
            <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={Colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Route size={56} color={Colors.neutral[300]} />}
              title={EMPTY_COPY[filter].title}
              description={EMPTY_COPY[filter].description}
              actionLabel={filter === 'active' ? EMPTY_COPY.active.action : undefined}
              onAction={filter === 'active' ? () => router.push('/(tabs)/home') : undefined}
            />
          }
          renderItem={({ item }) => (
            <MyTripCard
              item={item}
              cancelling={cancellingId === (item.trip?.id ?? item.booking?.id)}
              onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.tripId } })}
              onCancel={() => cancelItem(item)}
              onRate={() => openRateModal(item)}
            />
          )}
        />
      )}

      <RateModal
        visible={rateModal !== null}
        onClose={closeRateModal}
        onSubmit={submitRating}
        title="Calificar conductor"
        subtitle="Comparte tu experiencia en este viaje"
      />
    </Screen>
  );
}
