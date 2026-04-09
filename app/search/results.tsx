import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner } from '@/components/ui';
import { SearchResultsHeader } from '@/components/search/SearchResultsHeader';
import { SearchTripCard } from '@/components/search/SearchTripCard';
import { EmptySearchResults } from '@/components/search/EmptySearchResults';
import { Colors } from '@/constants/colors';
import { useSearchResults } from '@/hooks/useSearchResults';

export default function SearchResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    originLat: string;
    originLng: string;
    originName: string;
    destLat: string;
    destLng: string;
    destName: string;
    departureFrom: string;
    departureTo: string;
    tripType: string;
  }>();

  // Extract primitives once so the hook's deps remain stable
  // (useLocalSearchParams returns a new object reference every render).
  const {
    trips,
    loading,
    refreshing,
    loadingMore,
    error,
    radiusKm,
    load,
    refresh,
    loadMore,
  } = useSearchResults({
    originLat: params.originLat,
    originLng: params.originLng,
    destLat: params.destLat,
    destLng: params.destLng,
    departureFrom: params.departureFrom,
    departureTo: params.departureTo,
    tripType: params.tripType,
  });

  const openTripDetail = (tripId: string) => {
    router.push({ pathname: '/trip/[id]', params: { id: tripId, from: 'search' } });
  };

  return (
    <View className="flex-1 bg-neutral-50">
      <SearchResultsHeader
        originName={params.originName}
        destName={params.destName}
        departureFrom={params.departureFrom}
        radiusKm={radiusKm}
        tripsCount={loading ? null : trips.length}
        onBack={() => router.back()}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
          <Text className="text-sm text-neutral-400 mt-3">Buscando viajes...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Text className="text-sm text-neutral-500 text-center">{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={Colors.primary[500]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptySearchResults onBack={() => router.back()} />}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={Colors.primary[500]} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <SearchTripCard trip={item} onPress={() => openTripDetail(item.id)} />
          )}
        />
      )}
    </View>
  );
}
