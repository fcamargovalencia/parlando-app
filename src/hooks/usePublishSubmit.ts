import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { tripsApi } from '@/api/trips';
import { mapsService } from '@/lib/maps';
import { compactPolyline, extractApiError } from '@/lib/utils';
import { locationSubtitle } from '@/hooks/usePublishForm';
import type { TripType, WaypointRequest } from '@/types/api';
import type { PublishForm } from '@/hooks/usePublishForm';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import type { RouteAlternative } from '@/hooks/useRouteAlternatives';

interface UsePublishSubmitParams {
  form: PublishForm;
  tripType: TripType;
  waypoints: SelectedLocation[];
  onReset: () => void;
}

export function usePublishSubmit({
  form,
  tripType,
  waypoints,
  onReset,
}: UsePublishSubmitParams) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handlePublish = useCallback(
    async (selectedRoute: RouteAlternative | null, onSuccess?: () => void) => {
      if (!form.origin || !form.destination) {
        Alert.alert('Campos requeridos', 'Selecciona el origen y destino del viaje');
        return;
      }
      if (!form.vehicleId) {
        Alert.alert('Campos requeridos', 'Selecciona un vehículo para el viaje');
        return;
      }
      if (!form.pricePerSeat || parseInt(form.pricePerSeat) <= 0) {
        Alert.alert('Campos requeridos', 'Ingresa el precio por asiento');
        return;
      }
      if (!form.availableSeats || parseInt(form.availableSeats, 10) <= 0) {
        Alert.alert('Campos requeridos', 'Ingresa la cantidad de asientos disponibles');
        return;
      }
      if (form.departureAt <= new Date()) {
        Alert.alert('Fecha inválida', 'La fecha de salida debe ser en el futuro');
        return;
      }

      setSubmitting(true);
      try {
        const routeWaypoints: WaypointRequest[] = waypoints.map((w, idx) => ({
          latitude: w.latitude,
          longitude: w.longitude,
          orderIndex: idx,
          name: w.name,
          subtitle: locationSubtitle(w) || undefined,
          isPickupPoint: true,
        }));

        let travelTimeInSeconds: number | null = selectedRoute?.travelTimeInSeconds ?? null;

        try {
          const stops = [
            { latitude: form.origin.latitude, longitude: form.origin.longitude },
            ...waypoints.map((w) => ({ latitude: w.latitude, longitude: w.longitude })),
            { latitude: form.destination.latitude, longitude: form.destination.longitude },
          ];
          const { travelTimeInSeconds: routeDuration } = await mapsService.calculateRoute(stops);
          if (travelTimeInSeconds === null) travelTimeInSeconds = routeDuration;
        } catch (routeErr) {
          console.warn('[Maps] Route calculation failed, using estimated duration:', routeErr);
        }

        const arrivedAt =
          travelTimeInSeconds !== null
            ? new Date(form.departureAt.getTime() + travelTimeInSeconds * 1000).toISOString()
            : undefined;

        const routePolyline = selectedRoute?.points
          ? compactPolyline(selectedRoute.points, 300)
          : [];

        const { data: createRes } = await tripsApi.create({
          tripType,
          originName: form.origin.name,
          originSubtitle: locationSubtitle(form.origin) || undefined,
          originLatitude: form.origin.latitude,
          originLongitude: form.origin.longitude,
          destinationName: form.destination.name,
          destinationSubtitle: locationSubtitle(form.destination) || undefined,
          destinationLatitude: form.destination.latitude,
          destinationLongitude: form.destination.longitude,
          departureAt: form.departureAt.toISOString(),
          arrivedAt,
          availableSeats: parseInt(form.availableSeats, 10),
          pricePerSeat: parseFloat(form.pricePerSeat),
          currency: 'COP',
          vehicleId: form.vehicleId,
          allowsLuggage: form.allowsLuggage,
          studentsOnly: tripType === 'ROUTINE' ? form.studentsOnly : false,
          waypoints: routeWaypoints,
          routePolyline,
        });

        if (!createRes.data) throw new Error('Error al crear viaje');
        await tripsApi.publish(createRes.data.id);

        Toast.show({
          type: 'success',
          text1: '¡Viaje publicado!',
          text2: 'Tu viaje ya es visible para pasajeros',
        });

        onReset();
        onSuccess?.();
        router.push('/(tabs)/my-trips');
      } catch (err) {
        Alert.alert(
          'Error al publicar',
          extractApiError(err, 'No se pudo publicar el viaje. Intenta nuevamente.'),
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form, tripType, waypoints, onReset, router],
  );

  return { submitting, handlePublish };
}
