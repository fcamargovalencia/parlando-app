import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, ChevronRight, Map as MapIcon } from 'lucide-react-native';
import { Screen, Button, Card, Toggle } from '@/components/ui';
import { LocationPickerModal, type SelectedLocation } from '@/components/LocationPickerModal';
import { UniversityPicker } from '@/components/university/UniversityPicker';
import { RouteAlternativesModal } from '@/components/routine/RouteAlternativesModal';
import { usePublishRoutineTrip } from '@/hooks/usePublishRoutineTrip';
import { useRouteAlternatives } from '@/hooks/useRouteAlternatives';
import { compactPolyline } from '@/lib/geo';
import type { UniversityResponse } from '@/types/api';
import { Colors } from '@/constants/colors';

const NO_WAYPOINTS: SelectedLocation[] = [];

export default function Step1RouteScreen() {
  const router = useRouter();
  const {
    formData,
    updateForm,
    setSelectedUniversity,
    validateAndProceed,
    errors,
  } = usePublishRoutineTrip();

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
  const [routeModalOpen, setRouteModalOpen] = useState(false);

  const routeHook = useRouteAlternatives(originLoc, destLoc, NO_WAYPOINTS, !!(originLoc && destLoc));
  const { selectedId, alternatives, selected: selectedRoute } = routeHook;

  useEffect(() => {
    const route = alternatives.find(r => r.id === selectedId) ?? null;
    if (route) {
      updateForm({ routePolyline: compactPolyline(route.points, 300) });
    } else {
      updateForm({ routePolyline: undefined });
    }
  }, [selectedId, alternatives, updateForm]);

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
    });
  };

  const handleToggleUniDest = () => {
    const next = !uniDest;
    setUniDest(next);
    if (!next) {
      setDestLoc(null);
      setSelectedUniversity(null);
      updateForm({
        universityId: undefined,
        destinationName: undefined,
        destinationSubtitle: undefined,
        destinationLatitude: undefined,
        destinationLongitude: undefined,
      });
    }
  };

  const handleNext = () => {
    if (validateAndProceed(1)) {
      router.push('/routine/create/step-2-schedule');
    }
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-bold text-neutral-900 mb-1">Define la ruta</Text>
        <Text className="text-base text-neutral-500 mb-6">
          Indica de dónde sale y a dónde va tu viaje rutinario.
        </Text>

        {/* Origin */}
        <Text className="text-sm font-semibold text-neutral-700 mb-2">Punto de origen</Text>
        <TouchableOpacity
          onPress={() => setOriginOpen(true)}
          activeOpacity={0.7}
          className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white mb-1 ${errors.origin ? 'border-red-400' : 'border-neutral-200'}`}
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
            className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${errors.destination ? 'border-red-400' : 'border-neutral-200'}`}
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

        {/* Route picker button */}
        {originLoc && destLoc ? (
          <Card className="p-4">
            <Button
              variant="outline"
              size="sm"
              loading={alternatives.length === 0}
              onPress={() => setRouteModalOpen(true)}
              icon={<MapIcon size={16} color={Colors.primary[500]} />}
            >
              {selectedRoute
                ? `${selectedRoute.title} ✓`
                : 'Ver rutas disponibles'}
            </Button>
          </Card>
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
      {originLoc && destLoc ? (
        <RouteAlternativesModal
          visible={routeModalOpen}
          onClose={() => setRouteModalOpen(false)}
          alternatives={alternatives}
          selectedId={selectedId}
          onSelect={routeHook.selectById}
          origin={{ latitude: originLoc.latitude, longitude: originLoc.longitude, name: originLoc.name }}
          destination={{ latitude: destLoc.latitude, longitude: destLoc.longitude, name: destLoc.name }}
        />
      ) : null}
    </Screen>
  );
}

