import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, ChevronRight, Map as MapIcon } from 'lucide-react-native';
import { Screen, Button, Card, Toggle } from '@/components/ui';
import { LocationPickerModal, type SelectedLocation } from '@/components/LocationPickerModal';
import { RoutePreview } from '@/components/RoutePreview';
import { RouteLineMapModal } from '@/components/routine/RouteLineMapModal';
import { UniversityPicker } from '@/components/university/UniversityPicker';
import { usePublishRoutineTrip } from '@/hooks/usePublishRoutineTrip';
import { tomtomService } from '@/lib/tomtom';
import { compactPolyline } from '@/lib/geo';
import type { UniversityResponse } from '@/types/api';
import { Colors } from '@/constants/colors';

export default function Step1RouteScreen() {
  const router = useRouter();
  const {
    formData,
    updateForm,
    setSelectedUniversity,
    selectedUniversity,
    validateAndProceed,
    errors,
  } = usePublishRoutineTrip();

  // Local SelectedLocation mirrors for the location picker modals
  const [originLoc, setOriginLoc] = useState<SelectedLocation | null>(
    formData.originLatitude != null
      ? {
        name: formData.originName ?? '',
        subtitle: formData.originSubtitle,
        latitude: formData.originLatitude!,
        longitude: formData.originLongitude!,
      }
      : null,
  );
  const [destLoc, setDestLoc] = useState<SelectedLocation | null>(
    formData.destinationLatitude != null
      ? {
        name: formData.destinationName ?? '',
        subtitle: formData.destinationSubtitle,
        latitude: formData.destinationLatitude!,
        longitude: formData.destinationLongitude!,
      }
      : null,
  );

  const [uniDest, setUniDest] = useState(!!formData.universityId);
  const [originOpen, setOriginOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [drawingRoute, setDrawingRoute] = useState(false);
  const [routeMapOpen, setRouteMapOpen] = useState(false);

  const handleOriginConfirm = (loc: SelectedLocation) => {
    setOriginLoc(loc);
    updateForm({
      originName: loc.name,
      originSubtitle: loc.subtitle ?? undefined,
      originLatitude: loc.latitude,
      originLongitude: loc.longitude,
    });
    setOriginOpen(false);
  };

  const handleDestConfirm = (loc: SelectedLocation) => {
    setDestLoc(loc);
    updateForm({
      destinationName: loc.name,
      destinationSubtitle: loc.subtitle ?? undefined,
      destinationLatitude: loc.latitude,
      destinationLongitude: loc.longitude,
      universityId: undefined,
      routePolyline: undefined,
    });
    setSelectedUniversity(null);
    setDestOpen(false);
  };

  const handleUniversitySelect = (id: string, university: (UniversityResponse & { latitude: number; longitude: number; address: string; }) | null) => {
    if (!id || !university) {
      setDestLoc(null);
      setSelectedUniversity(null);
      updateForm({
        universityId: undefined,
        destinationName: undefined,
        destinationSubtitle: undefined,
        destinationLatitude: undefined,
        destinationLongitude: undefined,
        routePolyline: undefined,
      });
      return;
    }
    const loc: SelectedLocation = {
      name: university.name,
      subtitle: university.address,
      latitude: university.latitude,
      longitude: university.longitude,
    };
    setDestLoc(loc);
    setSelectedUniversity(university);
    updateForm({
      universityId: university.id,
      destinationName: university.name,
      destinationSubtitle: university.address,
      destinationLatitude: university.latitude,
      destinationLongitude: university.longitude,
      routePolyline: undefined,
    });
  };

  const handleToggleUniDest = () => {
    const next = !uniDest;
    setUniDest(next);
    if (!next) {
      // Clearing university destination
      setDestLoc(null);
      setSelectedUniversity(null);
      updateForm({
        universityId: undefined,
        destinationName: undefined,
        destinationSubtitle: undefined,
        destinationLatitude: undefined,
        destinationLongitude: undefined,
        routePolyline: undefined,
      });
    }
  };

  const handleDrawRoute = async () => {
    if (!originLoc || !destLoc) return;
    setDrawingRoute(true);
    try {
      const result = await tomtomService.calculateRoute([
        { latitude: originLoc.latitude, longitude: originLoc.longitude },
        { latitude: destLoc.latitude, longitude: destLoc.longitude },
      ]);
      const points = result.points?.length
        ? result.points
        : [
          { latitude: originLoc.latitude, longitude: originLoc.longitude },
          { latitude: destLoc.latitude, longitude: destLoc.longitude },
        ];
      updateForm({ routePolyline: compactPolyline(points, 300) });
      setRouteMapOpen(true);
    } catch (err) {
      Alert.alert('Error al trazar ruta', err instanceof Error ? err.message : 'No se pudo calcular la ruta');
    } finally {
      setDrawingRoute(false);
    }
  };

  const handleNext = () => {
    if (validateAndProceed(1)) {
      router.push('/routine/create/step-2-schedule');
    }
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <Text className="text-2xl font-bold text-neutral-900 mb-1">Define la ruta</Text>
        <Text className="text-base text-neutral-500 mb-6">
          Indica de dónde sale y a dónde va tu viaje rutinario.
        </Text>

        {/* Origin */}
        <Text className="text-sm font-semibold text-neutral-700 mb-2">Punto de origen</Text>
        <TouchableOpacity
          onPress={() => setOriginOpen(true)}
          activeOpacity={0.7}
          className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white mb-1 ${errors.origin ? 'border-red-400' : 'border-neutral-200'
            }`}
        >
          <MapPin size={18} color={originLoc ? Colors.primary[500] : Colors.neutral[400]} />
          <Text
            className={`ml-3 flex-1 text-base ${originLoc ? 'text-neutral-900' : 'text-neutral-400'}`}
            numberOfLines={1}
          >
            {originLoc?.name ?? 'Seleccionar origen'}
          </Text>
          <ChevronRight size={18} color={Colors.neutral[400]} />
        </TouchableOpacity>
        {errors.origin ? (
          <Text className="text-red-500 text-xs mb-4">{errors.origin}</Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* University destination toggle */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 mr-4">
            <Text className="text-sm font-semibold text-neutral-700">Destino es una universidad</Text>
            <Text className="text-xs text-neutral-400 mt-0.5">
              Selecciona del catálogo para sugerencias de horario
            </Text>
          </View>
          <Toggle value={uniDest} onPress={handleToggleUniDest} />
        </View>

        {/* Destination */}
        <Text className="text-sm font-semibold text-neutral-700 mb-2">Destino</Text>
        {uniDest ? (
          <UniversityPicker
            value={formData.universityId}
            selectedLabel={formData.destinationName}
            onChange={handleUniversitySelect}
          />
        ) : (
          <TouchableOpacity
            onPress={() => setDestOpen(true)}
            activeOpacity={0.7}
            className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${errors.destination ? 'border-red-400' : 'border-neutral-200'
              }`}
          >
            <MapPin size={18} color={destLoc ? Colors.accent[500] : Colors.neutral[400]} />
            <Text
              className={`ml-3 flex-1 text-base ${destLoc ? 'text-neutral-900' : 'text-neutral-400'}`}
              numberOfLines={1}
            >
              {destLoc?.name ?? 'Seleccionar destino'}
            </Text>
            <ChevronRight size={18} color={Colors.neutral[400]} />
          </TouchableOpacity>
        )}
        {errors.destination ? (
          <Text className="text-red-500 text-xs mt-1 mb-2">{errors.destination}</Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* Route preview + draw */}
        {originLoc && destLoc ? (
          <Card className={`p-4 ${errors.routePolyline ? 'border border-red-400' : ''}`}>
            <RoutePreview
              originName={originLoc.name}
              originSubtitle={originLoc.subtitle}
              destinationName={destLoc.name}
              destinationSubtitle={destLoc.subtitle}
            />
            <View className="mt-3">
              <Button
                variant="outline"
                size="sm"
                loading={drawingRoute}
                onPress={handleDrawRoute}
                icon={<MapIcon size={16} color={Colors.primary[500]} />}
              >
                {formData.routePolyline?.length ? 'Ruta trazada ✓' : 'Trazar ruta'}
              </Button>
            </View>
          </Card>
        ) : null}
        {errors.routePolyline ? (
          <Text className="text-red-500 text-xs mt-2">{errors.routePolyline}</Text>
        ) : null}
      </ScrollView>

      <View className="px-5 pb-6 pt-3 border-t border-neutral-100 bg-white">
        <Button onPress={handleNext}>Siguiente</Button>
      </View>

      <LocationPickerModal
        visible={originOpen}
        title="Punto de origen"
        onConfirm={handleOriginConfirm}
        onClose={() => setOriginOpen(false)}
        initial={originLoc}
      />
      <LocationPickerModal
        visible={destOpen}
        title="Destino"
        onConfirm={handleDestConfirm}
        onClose={() => setDestOpen(false)}
        initial={destLoc}
      />
      {formData.routePolyline?.length && originLoc && destLoc ? (
        <RouteLineMapModal
          visible={routeMapOpen}
          onClose={() => setRouteMapOpen(false)}
          routePolyline={formData.routePolyline}
          origin={{ latitude: originLoc.latitude, longitude: originLoc.longitude, name: originLoc.name }}
          destination={{ latitude: destLoc.latitude, longitude: destLoc.longitude, name: destLoc.name }}
        />
      ) : null}
    </Screen>
  );
}
