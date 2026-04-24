import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Bell, ChevronRight, GraduationCap, Repeat2 } from 'lucide-react-native';
import { Screen, Avatar, DatePickerModal } from '@/components/ui';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { SearchCard } from '@/components/home/SearchCard';
import { TripTypeSheet } from '@/components/home/TripTypeSheet';
import { TripTypeQuickActions } from '@/components/home/TripTypeQuickActions';
import { VerificationBanner } from '@/components/home/VerificationBanner';
import { useHomeSearch } from '@/hooks/useHomeSearch';
import { useHomeScreen } from '@/hooks/screens/useHomeScreen';
import { Colors } from '@/constants/colors';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);

  const { user, isDriver, refreshing, onRefresh, todayTrips, showVerificationBanner } = useHomeScreen();

  const {
    origin,
    destination,
    departureDate,
    tripType,
    isIntercity,
    canSearch,
    setOrigin,
    setDestination,
    setDepartureDate,
    setTripType,
    activePicker,
    setActivePicker,
    openOriginPicker,
    openDestPicker,
    selectTripTypeAndSearch,
    handleSearch,
  } = useHomeSearch();

  return (
    <Screen safe={false}>
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#003040', '#005660', '#007380']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 36,
            paddingHorizontal: 20,
          }}
        >
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center">
              <Avatar
                uri={user?.profilePhotoUrl}
                firstName={user?.firstName ?? 'U'}
                lastName={user?.lastName ?? ''}
                size="md"
              />
              <View className="ml-3">
                <Text className="text-sm" style={{ color: '#B3E0E3' }}>Hola,</Text>
                <Text className="text-lg font-bold text-white">
                  {user?.firstName ?? 'Usuario'} 👋
                </Text>
              </View>
            </View>
            <TouchableOpacity className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
              <Bell size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {showVerificationBanner && user && (
            <VerificationBanner
              user={user}
              onPress={() => router.push('/verification')}
            />
          )}

          <SearchCard
            origin={origin}
            destination={destination}
            departureDate={departureDate}
            tripType={tripType}
            canSearch={canSearch}
            onOpenOriginPicker={openOriginPicker}
            onOpenDestPicker={openDestPicker}
            onOpenDatePicker={() => setActivePicker('date')}
            onOpenTripTypeSheet={() => setActivePicker('tripType')}
            onSearch={handleSearch}
          />
        </LinearGradient>

        <TripTypeQuickActions
          tripType={tripType}
          onSelect={selectTripTypeAndSearch}
        />

        {isDriver && todayTrips.length > 0 && (
          <View className="px-5 pb-2">
            <Text className="text-base font-bold text-neutral-900 mb-3">Tus rutas de hoy</Text>
            {todayTrips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                onPress={() => router.push({ pathname: '/routine/[id]/occurrences', params: { id: trip.id } } as any)}
                activeOpacity={0.8}
                className="flex-row items-center rounded-2xl p-4 mb-2 gap-3 bg-white"
                style={{ borderWidth: 1.5, borderColor: Colors.primary[100] }}
              >
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: Colors.primary[100] }}
                >
                  <Repeat2 size={20} color={Colors.primary[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                    {trip.originName} → {trip.destinationName}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    Salida: {trip.departureTime}
                  </Text>
                </View>
                <ChevronRight size={16} color={Colors.neutral[400]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="px-5 pb-2">
          <Text className="text-base font-bold text-neutral-900 mb-3">Viajes universitarios</Text>
          <TouchableOpacity
            onPress={() => router.push('/search/routine')}
            activeOpacity={0.8}
            className="flex-row items-center rounded-2xl p-4 gap-3"
            style={{
              backgroundColor: Colors.primary[50],
              borderWidth: 1.5,
              borderColor: Colors.primary[200],
            }}
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: Colors.primary[100] }}
            >
              <GraduationCap size={22} color={Colors.primary[600]} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900">Rutas rutinarias</Text>
              <Text className="text-xs text-neutral-500 mt-0.5">
                Suscríbete a rutas universitarias recurrentes
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.primary[400]} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <LocationPickerModal
        visible={activePicker === 'origin'}
        title="Origen"
        initial={origin}
        allowCitySelection={isIntercity}
        onConfirm={(loc) => { setOrigin(loc); setActivePicker(null); }}
        onClose={() => setActivePicker(null)}
      />
      <LocationPickerModal
        visible={activePicker === 'destination'}
        title="Destino"
        initial={destination}
        allowCitySelection={isIntercity}
        onConfirm={(loc) => { setDestination(loc); setActivePicker(null); }}
        onClose={() => setActivePicker(null)}
      />

      <DatePickerModal
        visible={activePicker === 'date'}
        value={departureDate}
        mode="date"
        title="Fecha de viaje"
        minimumDate={today}
        onConfirm={(date) => { setDepartureDate(date); setActivePicker(null); }}
        onCancel={() => setActivePicker(null)}
      />

      <TripTypeSheet
        visible={activePicker === 'tripType'}
        tripType={tripType}
        onSelect={setTripType}
        onClose={() => setActivePicker(null)}
      />
    </Screen>
  );
}
