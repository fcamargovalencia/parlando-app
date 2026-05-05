import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useVehicles } from '@/hooks/useVehicles';
import Toast from 'react-native-toast-message';

export function useVehicleDetail() {
  const { id } = useLocalSearchParams<{ id: string; }>();
  const router = useRouter();
  const { selected: vehicle, loading, error, fetchVehicle, deleteVehicle } = useVehicles();
  const [deleting, setDeleting] = useState(false);

  // useFocusEffect ensures vehicle status is always fresh when the screen gains
  // focus — including when navigated here from a push notification (e.g.,
  // vehicle.verification_approved/rejected or vehicle.document_expiring).
  useFocusEffect(
    useCallback(() => {
      if (id) void fetchVehicle(id);
    }, [id, fetchVehicle]),
  );

  const handleDelete = useCallback(() => {
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
              Toast.show({ type: 'success', text1: 'Vehículo eliminado' });
              router.back();
            }
          },
        },
      ],
    );
  }, [vehicle, id, deleteVehicle, router]);

  const goBack = useCallback(() => router.back(), [router]);

  return {
    vehicle,
    loading,
    error,
    deleting,
    goBack,
    handleDelete,
  };
}
