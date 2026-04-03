import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Search,
  MapPin,
  Calendar,
  Bell,
  ChevronRight,
} from 'lucide-react-native';
import { Screen, Avatar, DatePickerModal } from '@/components/ui';
import { LocationPickerModal, type SelectedLocation } from '@/components/LocationPickerModal';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { TRIP_TYPE_OPTIONS } from '@/constants/trips';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/colors';
import dayjs from 'dayjs';
import type { TripType } from '@/types/api';

// Returns an ISO-8601 string with the local UTC offset (e.g. "2025-04-02T10:00:00-05:00")
// instead of a UTC "Z" string, so the backend can interpret the time in the user's timezone.
function toLocalISOString(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offsetMs);
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
  const mm = String(Math.abs(offsetMin) % 60).padStart(2, '0');
  return local.toISOString().slice(0, 19) + `${sign}${hh}:${mm}`;
}

// ── Location button ──

function LocationButton({
  label,
  value,
  accent,
  onPress,
}: {
  label: string;
  value: SelectedLocation | null;
  accent: boolean;
  onPress: () => void;
}) {
  const dotColor = accent ? Colors.accent[500] : Colors.primary[500];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="flex-row items-center bg-neutral-50 rounded-2xl px-3 py-4 border border-neutral-200"
      style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
    >
      <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: accent ? Colors.accent[50] : Colors.primary[50] }}>
        <MapPin size={16} color={dotColor} />
      </View>
      <View className="flex-1 ml-2.5">
        {value ? (
          <>
            <Text className="text-xs font-medium" style={{ color: Colors.neutral[400] }}>{label}</Text>
            <Text className="text-sm font-semibold text-neutral-900 mt-0.5" numberOfLines={1}>
              {value.name}
            </Text>
          </>
        ) : (
          <Text className="text-base text-neutral-400">{label}</Text>
        )}
      </View>
      <ChevronRight size={16} color={Colors.neutral[300]} />
    </TouchableOpacity>
  );
}

// ── Main screen ──

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Search form state
  const [origin, setOrigin] = useState<SelectedLocation | null>(null);
  const [destination, setDestination] = useState<SelectedLocation | null>(null);
  const [departureDate, setDepartureDate] = useState<Date>(new Date());
  const [tripType, setTripType] = useState<TripType>('INTERCITY');

  // Modal state
  const [originPickerVisible, setOriginPickerVisible] = useState(false);
  const [destPickerVisible, setDestPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [tripTypeSheetVisible, setTripTypeSheetVisible] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleSearch = () => {
    if (!origin || !destination) return;

    const isToday = dayjs(departureDate).isSame(dayjs(), 'day');
    const from = isToday
      ? toLocalISOString(dayjs().add(1, 'hour').toDate())
      : toLocalISOString(dayjs(departureDate).startOf('day').toDate());
    const to = toLocalISOString(dayjs(departureDate).endOf('day').toDate());

    router.push({
      pathname: '/search/results',
      params: {
        originLat: String(origin.latitude),
        originLng: String(origin.longitude),
        originName: origin.name,
        destLat: String(destination.latitude),
        destLng: String(destination.longitude),
        destName: destination.name,
        departureFrom: from,
        departureTo: to,
        tripType,
      },
    });
  };

  const canSearch = !!origin && !!destination;

  const showVerificationBanner = user && (
    user.verificationLevel === 'NONE' || user.verificationLevel === 'BASIC'
  );

  return (
    <Screen safe={false}>
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary[500]} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header gradient ── */}
        <LinearGradient
          colors={['#003040', '#005660', '#007380']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingBottom: 36, paddingHorizontal: 20 }}
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

          {/* Verification banner */}
          {showVerificationBanner && (
            <View className="mb-5">
              <LinearGradient
                colors={user!.verificationLevel === 'NONE' ? ['#ff3b30', '#ff7f50'] : ['#ffb300', '#ffe082']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-3xl"
                style={{ borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16 }}
              >
                <Text className="text-sm font-bold mb-1.5" style={{ color: user!.verificationLevel === 'NONE' ? '#fff' : '#7a4f01' }}>
                  {user!.verificationLevel === 'NONE' ? '¡Verificación requerida!' : 'Verifica tu identidad'}
                </Text>
                <Text className="text-xs leading-5 mb-3" style={{ color: user!.verificationLevel === 'NONE' ? '#fff' : '#7a4f01' }}>
                  {user!.verificationLevel === 'NONE'
                    ? 'Debes verificar tu identidad y teléfono para usar la app.'
                    : 'Completa la verificación para acceder a todas las funcionalidades.'}
                </Text>
                <TouchableOpacity
                  className="self-start px-4 py-1.5 rounded-xl"
                  style={{ backgroundColor: user!.verificationLevel === 'NONE' ? '#fff' : '#ffb300' }}
                  onPress={() => router.push('/verification')}
                  activeOpacity={0.85}
                >
                  <Text className="font-semibold text-xs" style={{ color: user!.verificationLevel === 'NONE' ? '#ff3b30' : '#7a4f01' }}>
                    {user!.verificationLevel === 'NONE' ? 'Verificar ahora' : 'Mejorar verificación'}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          {/* Search card */}
          <View
            className="bg-white rounded-3xl p-5"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8 }}
          >
            <Text className="text-base font-bold text-neutral-900 mb-4">¿A dónde vas?</Text>

            {/* Route inputs */}
            <View className="gap-2 mb-3">
              {/* Route line decoration */}
              <View className="flex-row">
                <View className="items-center mr-3 pt-5 pb-5" style={{ width: 20 }}>
                  <View className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.primary[500] }} />
                  <View className="flex-1 w-0.5 my-1" style={{ backgroundColor: Colors.neutral[200], minHeight: 18 }} />
                  <View className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.accent[500] }} />
                </View>
                <View className="flex-1 gap-2">
                  <LocationButton
                    label="¿Desde dónde sales?"
                    value={origin}
                    accent={false}
                    onPress={() => setOriginPickerVisible(true)}
                  />
                  <LocationButton
                    label="¿A dónde vas?"
                    value={destination}
                    accent={true}
                    onPress={() => setDestPickerVisible(true)}
                  />
                </View>
              </View>
            </View>

            {/* Date & trip type row */}
            <View className="flex-row gap-2 mb-4">
              {/* Date picker trigger */}
              <TouchableOpacity
                onPress={() => setDatePickerVisible(true)}
                activeOpacity={0.75}
                className="flex-1 flex-row items-center bg-neutral-50 rounded-2xl px-3 py-3.5 border border-neutral-200"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
              >
                <Calendar size={16} color={Colors.primary[500]} />
                <View className="ml-2 flex-1">
                  <Text className="text-xs font-medium" style={{ color: Colors.neutral[400] }}>Fecha</Text>
                  <Text className="text-sm font-semibold text-neutral-900">
                    {dayjs(departureDate).isSame(dayjs(), 'day')
                      ? 'Hoy'
                      : dayjs(departureDate).isSame(dayjs().add(1, 'day'), 'day')
                        ? 'Mañana'
                        : dayjs(departureDate).format('D MMM')}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Trip type trigger */}
              <TouchableOpacity
                onPress={() => setTripTypeSheetVisible(true)}
                activeOpacity={0.75}
                className="flex-1 flex-row items-center bg-neutral-50 rounded-2xl px-3 py-3.5 border border-neutral-200"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
              >
                <TripTypeIcon type={tripType} />
                <View className="ml-2 flex-1">
                  <Text className="text-xs font-medium" style={{ color: Colors.neutral[400] }}>Tipo</Text>
                  <Text className="text-sm font-semibold text-neutral-900">
                    {TRIP_TYPE_OPTIONS.find((t) => t.type === tripType)?.label}
                  </Text>
                </View>
                <ChevronRight size={14} color={Colors.neutral[300]} />
              </TouchableOpacity>
            </View>

            {/* Search button */}
            <TouchableOpacity
              onPress={handleSearch}
              activeOpacity={canSearch ? 0.8 : 1}
              className="rounded-2xl py-4 flex-row items-center justify-center"
              style={{ backgroundColor: canSearch ? Colors.primary[600] : Colors.neutral[200] }}
            >
              <Search size={18} color={canSearch ? '#FFF' : Colors.neutral[400]} />
              <Text
                className="font-bold ml-2 text-base"
                style={{ color: canSearch ? '#FFF' : Colors.neutral[400] }}
              >
                Buscar viaje
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Quick actions ── */}
        <View className="px-5 pt-6 pb-2">
          <Text className="text-base font-bold text-neutral-900 mb-3">Tipo de viaje</Text>
          <View className="flex-row gap-3">
            {TRIP_TYPE_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t.type}
                onPress={() => {
                  setTripType(t.type);
                  setOriginPickerVisible(true);
                }}
                activeOpacity={0.8}
                className="flex-1 rounded-2xl p-3.5 items-center"
                style={{
                  backgroundColor: tripType === t.type ? Colors.primary[50] : '#F8F9FA',
                  borderWidth: 1.5,
                  borderColor: tripType === t.type ? Colors.primary[300] : '#F0F0F0',
                }}
              >
                <TripTypeIcon type={t.type} size={22} />
                <Text className="text-xs font-semibold mt-2 text-center" style={{ color: Colors.neutral[700] }}>
                  {t.label}
                </Text>
                <Text className="text-xs mt-0.5 text-center" style={{ color: Colors.neutral[400] }} numberOfLines={1}>
                  {t.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Location pickers ── */}
      <LocationPickerModal
        visible={originPickerVisible}
        title="Origen"
        initial={origin}
        onConfirm={(loc) => { setOrigin(loc); setOriginPickerVisible(false); }}
        onClose={() => setOriginPickerVisible(false)}
      />
      <LocationPickerModal
        visible={destPickerVisible}
        title="Destino"
        initial={destination}
        onConfirm={(loc) => { setDestination(loc); setDestPickerVisible(false); }}
        onClose={() => setDestPickerVisible(false)}
      />

      {/* ── Date picker ── */}
      <DatePickerModal
        visible={datePickerVisible}
        value={departureDate}
        mode="date"
        title="Fecha de viaje"
        minimumDate={new Date()}
        onConfirm={(date) => { setDepartureDate(date); setDatePickerVisible(false); }}
        onCancel={() => setDatePickerVisible(false)}
      />

      {/* ── Trip type bottom sheet ── */}
      <Modal
        visible={tripTypeSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTripTypeSheetVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
          activeOpacity={1}
          onPress={() => setTripTypeSheetVisible(false)}
        />
        <View
          className="bg-white rounded-t-3xl px-5 pt-4 pb-8"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 16 }}
        >
          {/* Handle */}
          <View className="w-10 h-1 rounded-full bg-neutral-200 self-center mb-4" />
          <Text className="text-base font-bold text-neutral-900 mb-4">Tipo de viaje</Text>
          {TRIP_TYPE_OPTIONS.map((t) => {
            const selected = tripType === t.type;
            return (
              <TouchableOpacity
                key={t.type}
                onPress={() => { setTripType(t.type); setTripTypeSheetVisible(false); }}
                activeOpacity={0.7}
                className="flex-row items-center py-4 border-b border-neutral-100"
              >
                <View
                  className="w-11 h-11 rounded-2xl items-center justify-center mr-4"
                  style={{ backgroundColor: selected ? Colors.primary[50] : Colors.neutral[100] }}
                >
                  <TripTypeIcon type={t.type} size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-900">{t.label}</Text>
                  <Text className="text-xs text-neutral-400 mt-0.5">{t.subtitle}</Text>
                </View>
                {selected && (
                  <View className="w-5 h-5 rounded-full items-center justify-center" style={{ backgroundColor: Colors.primary[500] }}>
                    <View className="w-2 h-2 rounded-full bg-white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </Screen>
  );
}
