import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
  ArrowRight,
  Bus,
  Building2,
  GraduationCap,
  Bell,
} from 'lucide-react-native';
import { Screen, Card, Badge, Avatar } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/colors';

const tripTypes = [
  {
    icon: <Bus size={24} color={Colors.primary[600]} />,
    title: 'Interurbano',
    subtitle: 'Ciudad a ciudad',
    color: 'bg-primary-50',
  },
  {
    icon: <Building2 size={24} color={Colors.accent[600]} />,
    title: 'Urbano',
    subtitle: 'Dentro de tu ciudad',
    color: 'bg-accent-50',
  },
  {
    icon: <GraduationCap size={24} color="#3B82F6" />,
    title: 'Rutinario',
    subtitle: 'Universidad / Empresa',
    color: 'bg-blue-50',
  },
];

const popularRoutes = [
  { from: 'Bogotá', to: 'Medellín', trips: 24 },
  { from: 'Cali', to: 'Pereira', trips: 12 },
  { from: 'Bogotá', to: 'Bucaramanga', trips: 8 },
  { from: 'Medellín', to: 'Cartagena', trips: 6 },
];

export default function HomeScreen() {

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Estados para el formulario de búsqueda
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [passengers, setPassengers] = useState('');
  const [tripType, setTripType] = useState<'INTERCITY' | 'URBAN' | 'ROUTINE'>('INTERCITY');
  const [showTripTypeDropdown, setShowTripTypeDropdown] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Future: fetch nearby trips, refresh data
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Banner de verificación (ajustado)
  const showVerificationBanner = user && (user.verificationLevel === 'NONE' || user.verificationLevel === 'BASIC');
  const verificationBanner = showVerificationBanner && (
    <View className="mb-4">
      <LinearGradient
        colors={user.verificationLevel === 'NONE' ? ['#ff3b30', '#ff7f50'] : ['#ffb300', '#ffe082']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-3xl"
        style={{ borderWidth: 0, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 18 }}
      >
        <Text className="text-base font-bold mb-2" style={{ color: user.verificationLevel === 'NONE' ? '#fff' : '#7a4f01' }}>
          {user.verificationLevel === 'NONE' ? '¡Verificación requerida!' : 'Verifica tu identidad'}
        </Text>
        <Text className="text-sm leading-5 mb-3" style={{ color: user.verificationLevel === 'NONE' ? '#fff' : '#7a4f01' }}>
          {user.verificationLevel === 'NONE'
            ? 'Debes verificar tu identidad y teléfono para usar la app y generar confianza en la comunidad.'
            : 'Completa la verificación de identidad para acceder a todas las funcionalidades y aumentar tu confianza.'}
        </Text>
        <TouchableOpacity
          className="self-start px-5 py-2 rounded-2xl"
          style={{ backgroundColor: user.verificationLevel === 'NONE' ? '#fff' : '#ffb300' }}
          onPress={() => router.push('/verification')}
          activeOpacity={0.85}
        >
          <Text className="font-semibold text-sm" style={{ color: user.verificationLevel === 'NONE' ? '#ff3b30' : '#7a4f01' }}>
            {user.verificationLevel === 'NONE' ? 'Verificar ahora' : 'Mejorar verificación'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
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
      >
        <LinearGradient
          colors={['#003040', '#005660', '#007380']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 24 }}
        >
          {/* Top bar */}
          <View className="flex-row items-center justify-between mb-6">
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

          {/* Banner de verificación */}
          {verificationBanner}
          {/* Más separación entre banner y formulario */}
          <View style={{ height: 24 }} />
          {/* Formulario de búsqueda */}
          <View className="bg-white rounded-2xl p-4" style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 6,
          }}>
            <Text className="text-base font-bold text-neutral-900 mb-4">
              Buscar viaje
            </Text>
            {/* Input Origen */}
            <View className="flex-row items-center bg-neutral-50 rounded-2xl px-6 py-5 mb-5 w-full max-w-none border border-neutral-200" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
              <MapPin size={22} color={Colors.primary[500]} />
              <TextInput
                className="flex-1 ml-4 text-lg text-neutral-900 w-full max-w-none"
                placeholder="Origen"
                placeholderTextColor="#A3A3A3"
                value={origin}
                onChangeText={setOrigin}
              />
            </View>
            {/* Input Destino */}
            <View className="flex-row items-center bg-neutral-50 rounded-2xl px-6 py-5 mb-5 w-full max-w-none border border-neutral-200" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
              <MapPin size={22} color={Colors.accent[500]} />
              <TextInput
                className="flex-1 ml-4 text-lg text-neutral-900 w-full max-w-none"
                placeholder="Destino"
                placeholderTextColor="#A3A3A3"
                value={destination}
                onChangeText={setDestination}
              />
            </View>
            {/* Pasajeros y tipo de viaje en una fila */}
            <View className="flex-row gap-2 mb-4">
              {/* Input Pasajeros (40%) */}
              <View className="flex-row items-center bg-neutral-50 rounded-2xl px-6 py-5 w-full max-w-none border border-neutral-200" style={{ borderWidth: 1, borderColor: '#E5E7EB', flex: 0.5 }}>
                <Text style={{ fontSize: 22, color: Colors.primary[500] }}>👥</Text>
                <TextInput
                  className="flex-1 ml-4 text-lg text-neutral-900"
                  placeholder="Pasajeros"
                  placeholderTextColor="#A3A3A3"
                  keyboardType="numeric"
                  value={passengers}
                  onChangeText={setPassengers}
                />
              </View>
              {/* Dropdown tipo de viaje (60%) */}
              <View className="bg-neutral-50 rounded-2xl px-6 py-5 flex-row items-center w-full max-w-none border border-neutral-200" style={{ borderWidth: 1, borderColor: '#E5E7EB', flex: 0.5 }}>
                {tripType === 'INTERCITY' && <Bus size={20} color={Colors.primary[600]} />}
                {tripType === 'URBAN' && <Building2 size={20} color={Colors.accent[600]} />}
                {tripType === 'ROUTINE' && <GraduationCap size={20} color={'#3B82F6'} />}
                <TouchableOpacity
                  className="flex-1 ml-3 flex-row items-center justify-between"
                  activeOpacity={0.7}
                  onPress={() => setShowTripTypeDropdown((v) => !v)}
                >
                  <Text className="text-lg text-neutral-900 font-semibold">
                    {tripType === 'INTERCITY' ? 'Municipal' : tripType === 'URBAN' ? 'Urbano' : 'Rutinario'}
                  </Text>
                  <Text style={{ fontSize: 18, color: '#888' }}>▼</Text>
                </TouchableOpacity>
                {/* Dropdown menu */}
                {showTripTypeDropdown && (
                  <View style={{ position: 'absolute', top: 60, left: 0, right: 0, zIndex: 10 }} className="bg-white rounded-xl shadow p-2">
                    <TouchableOpacity className="flex-row items-center p-2" onPress={() => { setTripType('INTERCITY'); setShowTripTypeDropdown(false); }}>
                      <Bus size={20} color={Colors.primary[600]} />
                      <Text className="ml-2 text-lg text-primary-700 font-semibold">Municipal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center p-2" onPress={() => { setTripType('URBAN'); setShowTripTypeDropdown(false); }}>
                      <Building2 size={20} color={Colors.accent[600]} />
                      <Text className="ml-2 text-lg text-accent-700 font-semibold">Urbano</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center p-2" onPress={() => { setTripType('ROUTINE'); setShowTripTypeDropdown(false); }}>
                      <GraduationCap size={20} color={'#3B82F6'} />
                      <Text className="ml-2 text-lg text-blue-700 font-semibold">Rutinario</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            {/* Más separación antes del botón */}
            <View style={{ height: 18 }} />
            <TouchableOpacity
              className="bg-primary-500 px-6 py-3 rounded-xl flex-row items-center justify-center"
              activeOpacity={0.8}
            // onPress={handleSearch}
            >
              <Search size={18} color="#FFF" />
              <Text className="text-white font-semibold ml-2 text-lg">Buscar viaje</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>
    </Screen >
  );
}
