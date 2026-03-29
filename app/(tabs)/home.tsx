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

  const onRefresh = async () => {
    setRefreshing(true);
    // Future: fetch nearby trips, refresh data
    setTimeout(() => setRefreshing(false), 1000);
  };

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
        {/* Header with gradient */}
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

          {/* Search Card */}
          <View className="bg-white rounded-2xl p-4" style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 6,
          }}>
            <Text className="text-base font-bold text-neutral-900 mb-3">
              ¿A dónde vas?
            </Text>

            <TouchableOpacity
              className="flex-row items-center bg-neutral-50 rounded-xl px-4 py-3 mb-2"
              activeOpacity={0.7}
            >
              <View className="w-2.5 h-2.5 rounded-full bg-primary-500 mr-3" />
              <Text className="text-sm text-neutral-400 flex-1">Origen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center bg-neutral-50 rounded-xl px-4 py-3 mb-3"
              activeOpacity={0.7}
            >
              <View className="w-2.5 h-2.5 rounded-full bg-accent-500 mr-3" />
              <Text className="text-sm text-neutral-400 flex-1">Destino</Text>
            </TouchableOpacity>

            <View className="flex-row items-center">
              <TouchableOpacity className="flex-row items-center bg-neutral-50 rounded-xl px-3 py-2.5 flex-1 mr-2">
                <Calendar size={16} color={Colors.neutral[400]} />
                <Text className="text-sm text-neutral-400 ml-2">Fecha</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-primary-500 px-6 py-2.5 rounded-xl flex-row items-center"
                activeOpacity={0.8}
              >
                <Search size={18} color="#FFF" />
                <Text className="text-white font-semibold ml-2">Buscar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Trip Types */}
        <View className="px-6 mt-6">
          <Text className="text-lg font-bold text-neutral-900 mb-4">
            Tipo de viaje
          </Text>
          <View className="flex-row gap-3">
            {tripTypes.map((type, index) => (
              <TouchableOpacity
                key={index}
                className={`flex-1 ${type.color} rounded-2xl p-4 items-center`}
                activeOpacity={0.7}
              >
                <View className="w-12 h-12 rounded-full bg-white items-center justify-center mb-2">
                  {type.icon}
                </View>
                <Text className="text-sm font-semibold text-neutral-900">
                  {type.title}
                </Text>
                <Text className="text-[11px] text-neutral-500 mt-0.5">
                  {type.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Popular Routes */}
        <View className="px-6 mt-8 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-neutral-900">
              Rutas populares
            </Text>
            <TouchableOpacity>
              <Text className="text-sm font-semibold text-primary-600">Ver todas</Text>
            </TouchableOpacity>
          </View>
          {popularRoutes.map((route, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
            >
              <Card className="mb-3">
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <MapPin size={14} color={Colors.primary[500]} />
                      <Text className="text-sm font-medium text-neutral-900 ml-1.5">
                        {route.from}
                      </Text>
                      <ArrowRight size={14} color={Colors.neutral[400]} className="mx-2" />
                      <MapPin size={14} color={Colors.accent[500]} />
                      <Text className="text-sm font-medium text-neutral-900 ml-1.5">
                        {route.to}
                      </Text>
                    </View>
                  </View>
                  <Badge
                    label={`${route.trips} viajes`}
                    variant="success"
                  />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Safety Banner */}
        <View className="px-6 mb-6">
          <LinearGradient
            colors={['#003040', '#004650']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl p-5"
          >
            <Text className="text-base font-bold text-white mb-1">
              🛡️ Viaja con seguridad
            </Text>
            <Text className="text-sm text-gray-300 leading-5">
              Verifica tu identidad para acceder a todas las funcionalidades y
              generar confianza en la comunidad.
            </Text>
            <TouchableOpacity
              className="bg-accent-500 self-start px-4 py-2 rounded-xl mt-3"
              onPress={() => router.push('/verification')}
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-sm">
                Verificar ahora
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </Screen>
  );
}
