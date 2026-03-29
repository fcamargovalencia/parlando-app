import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Calendar,
  Palette,
  Users,
  Hash,
  Edit3,
  Trash2,
  Car,
  ShieldCheck,
} from 'lucide-react-native';
import { Screen, Button, Badge, Spinner, Card } from '@/components/ui';
import { useVehicles } from '@/hooks/useVehicles';
import { Colors } from '@/constants/colors';
import { formatDate, getStatusColor } from '@/lib/utils';
import type { VehicleStatus } from '@/types/api';
import Toast from 'react-native-toast-message';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selected: vehicle, loading, error, fetchVehicle, deleteVehicle } = useVehicles();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) fetchVehicle(id);
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      'Eliminar vehículo',
      `¿Estás seguro de que deseas eliminar ${vehicle?.brand} ${vehicle?.model}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const success = await deleteVehicle(id!);
            setDeleting(false);
            if (success) {
              Toast.show({
                type: 'success',
                text1: 'Vehículo eliminado',
              });
              router.back();
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <Spinner fullScreen message="Cargando vehículo..." />;
  }

  if (error || !vehicle) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-6">
          <Car size={56} color={Colors.neutral[300]} />
          <Text className="text-lg font-semibold text-neutral-700 mt-4 mb-1">
            No se pudo cargar el vehículo
          </Text>
          <Text className="text-sm text-neutral-400 mb-4 text-center">{error}</Text>
          <Button variant="outline" onPress={() => router.back()}>
            Volver
          </Button>
        </View>
      </Screen>
    );
  }

  const statusVariant = getStatusColor(vehicle.status as VehicleStatus);

  return (
    <Screen safe={false}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View className="h-56 bg-neutral-200">
          {vehicle.photoUrls && vehicle.photoUrls.length > 0 ? (
            <Image
              source={{ uri: vehicle.photoUrls[0] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Car size={64} color={Colors.neutral[400]} />
              <Text className="text-sm text-neutral-400 mt-2">Sin foto</Text>
            </View>
          )}

          {/* Status Badge Overlay */}
          <View className="absolute top-4 right-4">
            <Badge variant={statusVariant as any} label={vehicle.status} />
          </View>
        </View>

        {/* Vehicle Title */}
        <View className="px-6 pt-5 pb-3">
          <Text className="text-2xl font-bold text-neutral-900">
            {vehicle.brand} {vehicle.model}
          </Text>
          <Text className="text-base text-neutral-500 mt-1">{vehicle.color}</Text>
        </View>

        {/* Details Card */}
        <View className="px-6 mb-4">
          <Card>
            <DetailRow
              icon={<Hash size={20} color={Colors.primary[600]} />}
              label="Placa"
              value={vehicle.plateNumber}
            />
            <DetailRow
              icon={<Calendar size={20} color={Colors.primary[600]} />}
              label="Año"
              value={vehicle.year?.toString()}
            />
            <DetailRow
              icon={<Palette size={20} color={Colors.primary[600]} />}
              label="Color"
              value={vehicle.color}
            />
            <DetailRow
              icon={<Users size={20} color={Colors.primary[600]} />}
              label="Capacidad"
              value={`${vehicle.capacity} pasajeros`}
            />
            <DetailRow
              icon={<ShieldCheck size={20} color={Colors.accent[600]} />}
              label="SOAT vigente hasta"
              value={vehicle.soatExpiry ? formatDate(vehicle.soatExpiry) : 'No registrado'}
              last
            />
          </Card>
        </View>

        {/* Documents Card */}
        <View className="px-6 mb-6">
          <Text className="text-base font-semibold text-neutral-800 mb-3">Documentos</Text>
          <Card>
            <DocumentRow label="SOAT" hasDocument={!!vehicle.soatDocumentUrl} />
            <DocumentRow label="Tarjeta de propiedad" hasDocument={!!vehicle.transitCardUrl} last />
          </Card>
        </View>

        {/* Actions */}
        <View className="px-6 gap-3">
          <Button
            variant="outline"
            onPress={() => Alert.alert('Próximamente', 'La edición de vehículos estará disponible pronto.')}
            size="lg"
            icon={<Edit3 size={18} color={Colors.primary[600]} />}
            className="w-full"
          >
            Editar vehículo
          </Button>

          <Button
            variant="danger"
            onPress={handleDelete}
            loading={deleting}
            size="lg"
            icon={<Trash2 size={18} color="white" />}
            className="w-full"
          >
            Eliminar vehículo
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── Detail Row ──

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  last?: boolean;
}) {
  return (
    <View className={`flex-row items-center py-3 ${!last ? 'border-b border-neutral-100' : ''}`}>
      <View className="mr-3">{icon}</View>
      <Text className="text-sm text-neutral-500 flex-1">{label}</Text>
      <Text className="text-sm font-medium text-neutral-800">{value || '-'}</Text>
    </View>
  );
}

// ── Document Row ──

function DocumentRow({
  label,
  hasDocument,
  last = false,
}: {
  label: string;
  hasDocument: boolean;
  last?: boolean;
}) {
  return (
    <View className={`flex-row items-center py-3 ${!last ? 'border-b border-neutral-100' : ''}`}>
      <View
        className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${
          hasDocument ? 'bg-green-100' : 'bg-red-50'
        }`}
      >
        <ShieldCheck
          size={16}
          color={hasDocument ? Colors.primary[600] : '#EF4444'}
        />
      </View>
      <Text className="text-sm text-neutral-700 flex-1">{label}</Text>
      <Badge variant={hasDocument ? 'success' : 'error'} label={hasDocument ? 'Cargado' : 'Pendiente'} />
    </View>
  );
}
