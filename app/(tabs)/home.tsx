import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Bell } from 'lucide-react-native';
import { Screen, Avatar, DatePickerModal } from '@/components/ui';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { SearchCard } from '@/components/home/SearchCard';
import { TripTypeSheet } from '@/components/home/TripTypeSheet';
import { TripTypeQuickActions } from '@/components/home/TripTypeQuickActions';
import { VerificationBanner } from '@/components/home/VerificationBanner';
import { useAuthStore } from '@/stores/auth-store';
import { useHomeSearch } from '@/hooks/useHomeSearch';
import { Colors } from '@/constants/colors';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const showVerificationBanner =
    user && (user.verificationLevel === 'NONE' || user.verificationLevel === 'BASIC');

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
        {/* Header gradient */}
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
          {/* Top bar */}
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

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Location pickers */}
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

      {/* Date picker */}
      <DatePickerModal
        visible={activePicker === 'date'}
        value={departureDate}
        mode="date"
        title="Fecha de viaje"
        minimumDate={new Date()}
        onConfirm={(date) => { setDepartureDate(date); setActivePicker(null); }}
        onCancel={() => setActivePicker(null)}
      />

      {/* Trip type sheet */}
      <TripTypeSheet
        visible={activePicker === 'tripType'}
        tripType={tripType}
        onSelect={setTripType}
        onClose={() => setActivePicker(null)}
      />
    </Screen>
  );
}
