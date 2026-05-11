import React from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Car, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { usePublishForm } from '@/hooks/usePublishForm';
import { usePublishSubmit } from '@/hooks/usePublishSubmit';
import { usePublishScreen, TOTAL_STEPS } from '@/hooks/usePublishScreen';
import { PublishHeader } from '@/components/publish/PublishHeader';
import { StepTripType } from '@/components/publish/StepTripType';
import { StepLocation } from '@/components/publish/StepLocation';
import { StepWaypoints } from '@/components/publish/StepWaypoints';
import { StepRoute } from '@/components/publish/StepRoute';
import { StepDateTime } from '@/components/publish/StepDateTime';
import { StepSeatsOptions } from '@/components/publish/StepSeatsOptions';
import { StepVehicle } from '@/components/publish/StepVehicle';
import { TripSummary } from '@/components/publish/TripSummary';

export default function PublishScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();

  const {
    tripType,
    setTripType,
    form,
    dispatch,
    waypoints,
    setWaypoints,
    loadingVehicles,
    activeVehicles,
    vehicleOptions,
    selectedVehicle,
    reset,
  } = usePublishForm();

  const { submitting, handlePublish } = usePublishSubmit({
    form,
    tripType,
    waypoints,
    onReset: reset,
  });

  const {
    originSearch,
    destinationSearch,
    routeHook,
    step,
    setStep,
    stepOpacity,
    stepTranslateX,
    progressValue,
    locationPicker,
    setLocationPicker,
    tripTypeLabel,
    goNext,
    goBack,
    handleSuggestionSelect,
    handleLocationConfirm,
    addWaypoint,
    moveWaypointUp,
    moveWaypointDown,
  } = usePublishScreen({ form, dispatch, waypoints, setWaypoints, submitting, tripType });

  const stepAnimStyle = useAnimatedStyle(() => ({
    opacity: stepOpacity.value,
    transform: [{ translateX: stepTranslateX.value }],
  }));

  const stepRenderers: Record<number, () => React.ReactElement> = {
    1: () => <StepTripType tripType={tripType} onSelect={setTripType} />,
    2: () => (
      <StepLocation
        target="origin"
        search={originSearch}
        form={form}
        onMapPress={() => setLocationPicker({ visible: true, target: 'origin' })}
        onSuggestionSelect={(item) => handleSuggestionSelect('origin', item)}
      />
    ),
    3: () => (
      <StepLocation
        target="destination"
        search={destinationSearch}
        form={form}
        onMapPress={() => setLocationPicker({ visible: true, target: 'destination' })}
        onSuggestionSelect={(item) => handleSuggestionSelect('destination', item)}
      />
    ),
    4: () => (
      <StepWaypoints
        form={form}
        waypoints={waypoints}
        onAddWaypoint={addWaypoint}
        onMoveUp={moveWaypointUp}
        onMoveDown={moveWaypointDown}
        onRemove={(idx) => setWaypoints((prev) => prev.filter((_, i) => i !== idx))}
      />
    ),
    5: () => (
      <StepRoute
        form={form}
        waypoints={waypoints}
        routeHook={routeHook}
        windowHeight={windowHeight}
        goNext={goNext}
        submitting={submitting}
      />
    ),
    6: () => <StepDateTime departureAt={form.departureAt} dispatch={dispatch} />,
    7: () => (
      <StepSeatsOptions
        availableSeats={form.availableSeats}
        pricePerSeat={form.pricePerSeat}
        allowsLuggage={form.allowsLuggage}
        studentsOnly={form.studentsOnly}
        tripType={tripType}
        dispatch={dispatch}
      />
    ),
    8: () => (
      <StepVehicle
        vehicleId={form.vehicleId}
        vehicleOptions={vehicleOptions}
        loadingVehicles={loadingVehicles}
        hasRegisteredVehicles={vehicleOptions.length > 0}
        dispatch={dispatch}
      />
    ),
  };

  const renderStepContent = () =>
    stepRenderers[step]?.() ?? (
      <TripSummary
        form={form}
        tripType={tripType}
        tripTypeLabel={tripTypeLabel}
        selectedRoute={routeHook.selected}
        routeMode={routeHook.routeMode}
        selectedVehicle={selectedVehicle}
      />
    );

  return (
    <Screen edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-4 pb-2"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6">
            <Text className="text-2xl font-bold text-neutral-900">Publicar viaje</Text>
          </View>

          {loadingVehicles ? (
            <Card className="mb-6">
              <View className="items-center py-10">
                <ActivityIndicator size="large" color={Colors.primary[500]} />
              </View>
            </Card>
          ) : activeVehicles.length === 0 ? (
            <Card className="mb-6">
              <View className="items-center py-8 px-4">
                <View className="w-16 h-16 rounded-full bg-primary-50 items-center justify-center mb-4">
                  <Car size={32} color={Colors.primary[500]} />
                </View>
                <Text className="text-base font-bold text-neutral-900 text-center mb-2">
                  Necesitas un vehículo
                </Text>
                <Text className="text-sm text-neutral-500 text-center mb-6">
                  Para publicar un viaje debes tener al menos un vehículo activo.
                </Text>
                <Button onPress={() => router.push('/vehicle/add')} size="lg" className="w-full">
                  Registrar vehículo
                </Button>
              </View>
            </Card>
          ) : (
            <>
              <PublishHeader
                step={step}
                totalSteps={TOTAL_STEPS}
                submitting={submitting}
                progressValue={progressValue}
                onBack={goBack}
              />

              <Card className={step === TOTAL_STEPS ? 'mb-2' : 'mb-6'}>
                <Animated.View pointerEvents="box-none" style={stepAnimStyle}>
                  {renderStepContent()}
                </Animated.View>
              </Card>

              <View className={step < TOTAL_STEPS ? 'items-end' : 'items-center'}>
                {step === 5 ? null : step < TOTAL_STEPS ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (step === 1 && tripType === 'ROUTINE') {
                        router.push('/routine/create/step-1-route');
                        return;
                      }
                      goNext();
                    }}
                    disabled={submitting}
                    activeOpacity={0.85}
                    className="w-14 h-14 rounded-full bg-primary-500 items-center justify-center"
                  >
                    <ChevronRight size={24} color="white" />
                  </TouchableOpacity>
                ) : (
                  <Button
                    onPress={() =>
                      handlePublish(routeHook.selected, () => {
                        setStep(1);
                        originSearch.setQuery('');
                        destinationSearch.setQuery('');
                      })
                    }
                    size="lg"
                    className="px-6"
                    loading={submitting}
                    disabled={submitting}
                  >
                    Publicar viaje
                  </Button>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPickerModal
        visible={locationPicker.visible}
        title={
          locationPicker.target === 'origin'
            ? 'Seleccionar origen'
            : locationPicker.target === 'destination'
              ? 'Seleccionar destino'
              : 'Agregar ciudad intermedia'
        }
        onConfirm={handleLocationConfirm}
        onClose={() =>
          setLocationPicker((p) => ({ ...p, visible: false, municipalityFocus: undefined, initialLocation: undefined }))
        }
        initial={locationPicker.initialLocation ?? (locationPicker.target === 'origin' ? form.origin : form.destination)}
        mode={locationPicker.target === 'waypoint' ? 'full' : 'map-only'}
        mapHintText={
          locationPicker.target === 'destination'
            ? 'Selecciona el lugar de finalizacion del viaje'
            : 'Selecciona el lugar de encuentro para iniciar el viaje'
        }
        municipalityFocus={locationPicker.municipalityFocus}
      />
    </Screen>
  );
}
