import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Bell, ChevronRight, History, Repeat2 } from 'lucide-react-native';
import { Screen, Avatar, DatePickerModal } from '@/components/ui';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { SearchCard } from '@/components/home/SearchCard';
import { VerificationBanner } from '@/components/home/VerificationBanner';
import { EmailVerificationBanner } from '@/components/home/EmailVerificationBanner';
import { useHomeSearch } from '@/hooks/useHomeSearch';
import { useHomeScreen } from '@/hooks/screens/useHomeScreen';
import { Colors } from '@/constants/colors';
import { useNotificationsStore } from '@/stores/notifications-store';

const GRADIENT_COLORS = ['#003040', '#005660', '#007380'] as const;
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);
  const gradientStyle = useMemo(
    () => ({ paddingTop: insets.top + 12, paddingBottom: 36, paddingHorizontal: 20 }),
    [insets.top],
  );

  const { user, isDriver, refreshing, onRefresh, todayTrips, showVerificationBanner } = useHomeScreen();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const {
    origin,
    destination,
    departureDate,
    tripType,
    isIntercity,
    canSearch,
    passengers,
    destinationMode,
    selectedUniversity,
    setOrigin,
    setDestination,
    setDepartureDate,
    setTripType,
    setPassengers,
    activePicker,
    setActivePicker,
    openOriginPicker,
    openDestPicker,
    selectTripTypeAndSearch,
    handleSearch,
    handleDestinationModeChange,
    handleUniversitySelect,
  } = useHomeSearch();

  const onPressVerification = useCallback(() => router.push('/verification'), [router]);
  const onOpenDatePicker = useCallback(() => setActivePicker('date'), [setActivePicker]);
  const onPressRoutineSearch = useCallback(() => router.push('/search/routine'), [router]);
  const onCloseActivePicker = useCallback(() => setActivePicker(null), [setActivePicker]);
  const onConfirmOrigin = useCallback(
    (loc: Parameters<typeof setOrigin>[0]) => { setOrigin(loc); setActivePicker(null); },
    [setOrigin, setActivePicker],
  );
  const onConfirmDestination = useCallback(
    (loc: Parameters<typeof setDestination>[0]) => { setDestination(loc); setActivePicker(null); },
    [setDestination, setActivePicker],
  );
  const onConfirmDate = useCallback(
    (date: Date) => { setDepartureDate(date); setActivePicker(null); },
    [setDepartureDate, setActivePicker],
  );

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
          colors={GRADIENT_COLORS}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={gradientStyle}
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
            <TouchableOpacity
              onPress={() => router.push('/notifications' as never)}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <Bell size={20} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {unreadCount > 9 ? '9+' : String(unreadCount)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {showVerificationBanner && user && (
            <VerificationBanner
              user={user}
              onPress={onPressVerification}
            />
          )}

          <SearchCard
            origin={origin}
            destination={destination}
            departureDate={departureDate}
            tripType={tripType}
            canSearch={canSearch}
            passengers={passengers}
            destinationMode={destinationMode}
            selectedUniversity={selectedUniversity}
            onOpenOriginPicker={openOriginPicker}
            onOpenDestPicker={openDestPicker}
            onOpenDatePicker={onOpenDatePicker}
            onTripTypeChange={setTripType}
            onPassengersChange={setPassengers}
            onDestinationModeChange={handleDestinationModeChange}
            onUniversitySelect={handleUniversitySelect}
            onSearch={handleSearch}
          />
        </LinearGradient>

        {/* Banner de verificación de email — no bloqueante, solo para usuarios LOCAL sin verificar */}
        {user && <EmailVerificationBanner user={user} />}

        {isDriver && todayTrips.length > 0 && (
          <View className="px-5 pt-6 pb-2">
            <Text className="text-base font-bold text-neutral-900 mb-3">Tus rutas de hoy</Text>
            {todayTrips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                onPress={() => router.push(`/routine/${trip.id}/occurrences`)}
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

        <View className="px-5 pt-6 pb-2">
          <Text className="text-base font-bold text-neutral-900 mb-3">Viajes rutinarios</Text>
          <TouchableOpacity
            onPress={onPressRoutineSearch}
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
              <History size={22} color={Colors.primary[600]} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900">Rutas</Text>
              <Text className="text-xs text-neutral-500 mt-0.5">
                Suscríbete a rutas recurrentes
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
        onConfirm={onConfirmOrigin}
        onClose={onCloseActivePicker}
      />
      <LocationPickerModal
        visible={activePicker === 'destination'}
        title="Destino"
        initial={destination}
        allowCitySelection={isIntercity}
        onConfirm={onConfirmDestination}
        onClose={onCloseActivePicker}
      />

      <DatePickerModal
        visible={activePicker === 'date'}
        value={departureDate}
        mode="date"
        title="Fecha de viaje"
        minimumDate={today}
        onConfirm={onConfirmDate}
        onCancel={onCloseActivePicker}
      />

    </Screen>
  );
}
