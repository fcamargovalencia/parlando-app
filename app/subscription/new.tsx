import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  Clock,
  Info,
  MessageCircle,
  ShieldAlert,
  Users,
} from 'lucide-react-native';
import { Button, Card, DatePickerModal, Spinner } from '@/components/ui';
import { DaySelector } from '@/components/routine/DaySelector';
import { PickupTypeSelector } from '@/components/routine/PickupTypeSelector';
import { RoutePreview } from '@/components/RoutePreview';
import { SectionHeader } from '@/components/subscription/SectionHeader';
import { DateField } from '@/components/subscription/DateField';
import { StudentVerificationModal } from '@/components/subscription/StudentVerificationModal';
import { Colors } from '@/constants/colors';
import { formatCurrency } from '@/lib/utils';
import { useSubscriptionNewScreen } from '@/hooks/screens/useSubscriptionNewScreen';

export default function NewSubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    routineTrip,
    waypoints,
    formData,
    errors,
    isLoading,
    isSubmitting,
    loadingError,
    updateForm,
    previewDeviation,
    pickupSelection,
    hasEndDate,
    pickerTarget,
    setPickerTarget,
    showVerificationSheet,
    setShowVerificationSheet,
    startDateObj,
    endDateObj,
    minStartDate,
    isStudentVerificationRequired,
    isDuplicate,
    universityId,
    hasPendingVerification,
    universityName,
    handlePickerConfirm,
    handleDaysChange,
    handlePickupSelect,
    handleToggleEndDate,
    handleSeatsChange,
    handleSpecialRequirementsChange,
    handleSubmit,
  } = useSubscriptionNewScreen();

  const handleContactDriver = () => {
    if (!routineTrip) return;
    router.push({
      pathname: '/chat/routine/[routineTripId]' as any,
      params: {
        routineTripId: routineTrip.id,
        otherUserId: routineTrip.driverId,
        otherUserName: 'Conductor',
      },
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <Spinner />
      </View>
    );
  }

  if (loadingError || !routineTrip) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center px-8">
        <AlertCircle size={40} color={Colors.semantic.error} />
        <Text className="text-base font-semibold text-neutral-800 mt-3 text-center">
          {loadingError ?? 'No se pudo cargar la ruta'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-sm font-semibold text-primary-600">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasSpecialRequirements = !!formData.specialRequirements?.trim();

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neutral-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-row items-center px-4 py-3 bg-white border-b border-neutral-100"
        style={{ paddingTop: insets.top + 12 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="mr-3"
        >
          <ChevronLeft size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-neutral-900">Solicitar suscripción</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Route summary */}
        <View className="mx-4 mt-4">
          <Card className="p-4">
            <RoutePreview
              originName={routineTrip.originName}
              originSubtitle={routineTrip.originSubtitle}
              destinationName={routineTrip.destinationName}
              destinationSubtitle={routineTrip.destinationSubtitle}
              rightContent={
                <View className="items-end justify-center ml-3">
                  <Text className="text-base font-bold text-neutral-900">
                    {formatCurrency(routineTrip.pricePerSeat, routineTrip.currency)}
                  </Text>
                  <Text className="text-xs text-neutral-400">por cupo</Text>
                </View>
              }
            />
            <View className="flex-row items-center gap-1.5 mt-3 pt-3 border-t border-neutral-100">
              <Clock size={13} color={Colors.neutral[400]} />
              <Text className="text-xs text-neutral-600">
                Salida {routineTrip.departureTime} · Llega antes de {routineTrip.requiredArrivalTime}
              </Text>
            </View>
          </Card>
        </View>

        {/* Sección 1: Punto de recogida */}
        <View className="mx-4 mt-5">
          <SectionHeader number={1} title="Punto de recogida" />
          <PickupTypeSelector
            routineTrip={routineTrip}
            waypoints={waypoints}
            selection={pickupSelection}
            onSelect={handlePickupSelect}
            previewDeviation={previewDeviation}
            error={errors.pickup}
          />
        </View>

        {/* Sección 2: Días, fechas y cupos */}
        <View className="mx-4 mt-6">
          <SectionHeader number={2} title="Configuración" />

          <Card className="p-4 gap-4">
            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-2">
                Días que necesitas
              </Text>
              <DaySelector
                selected={formData.subscribedDays ?? []}
                onChange={handleDaysChange}
                allowedDays={routineTrip.recurrenceDays}
                error={errors.subscribedDays}
              />
              {routineTrip.recurrenceDays.length < 7 && (
                <Text className="text-xs text-neutral-400 mt-1.5">
                  Solo se muestran los días que opera esta ruta
                </Text>
              )}
            </View>

            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-1.5">
                Fecha de inicio
              </Text>
              <DateField
                value={startDateObj ?? null}
                placeholder="Seleccionar fecha..."
                onPress={() => setPickerTarget('startDate')}
                error={errors.startDate}
              />
            </View>

            <View>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-semibold text-neutral-700">
                    ¿Tiene fecha de fin?
                  </Text>
                  <Text className="text-xs text-neutral-400 mt-0.5">
                    Deja sin fecha para una suscripción indefinida
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleToggleEndDate}
                  activeOpacity={0.8}
                  className={`w-12 h-7 rounded-full justify-center px-0.5 ${hasEndDate ? 'bg-primary-500' : 'bg-neutral-200'}`}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white ${hasEndDate ? 'self-end' : 'self-start'}`}
                    style={{ elevation: 2 }}
                  />
                </TouchableOpacity>
              </View>

              {hasEndDate && (
                <View className="mt-3">
                  <DateField
                    value={endDateObj ?? null}
                    placeholder="Seleccionar fecha de fin..."
                    onPress={() => setPickerTarget('endDate')}
                  />
                </View>
              )}
            </View>

            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-1.5">
                Cupos requeridos
              </Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={() => updateForm({ seatsRequired: Math.max(1, (formData.seatsRequired ?? 1) - 1) })}
                  activeOpacity={0.75}
                  className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center border border-neutral-200"
                >
                  <Text className="text-lg font-bold text-neutral-700">−</Text>
                </TouchableOpacity>
                <View className="flex-1 items-center">
                  <TextInput
                    value={String(formData.seatsRequired ?? 1)}
                    onChangeText={handleSeatsChange}
                    keyboardType="number-pad"
                    className="text-2xl font-bold text-neutral-900 text-center"
                    style={{ minWidth: 48 }}
                  />
                  <Text className="text-xs text-neutral-400">cupo(s)</Text>
                </View>
                <TouchableOpacity
                  onPress={() => updateForm({ seatsRequired: Math.min(routineTrip.availableSeats, (formData.seatsRequired ?? 1) + 1) })}
                  activeOpacity={0.75}
                  className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center border border-neutral-200"
                >
                  <Text className="text-lg font-bold text-neutral-700">+</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center gap-1.5 mt-2">
                <Users size={12} color={Colors.neutral[400]} />
                <Text className="text-xs text-neutral-400">
                  Máximo {routineTrip.availableSeats} cupos disponibles en esta ruta
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Sección 3: Necesidades especiales */}
        <View className="mx-4 mt-6">
          <SectionHeader number={3} title="Necesidades especiales" />

          <Card className="p-4">
            <TextInput
              value={formData.specialRequirements ?? ''}
              onChangeText={handleSpecialRequirementsChange}
              placeholder="Ej. Necesito espacio para bicicleta, llevaré equipaje grande..."
              placeholderTextColor={Colors.neutral[400]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="text-sm text-neutral-800 min-h-[72px]"
              style={{ lineHeight: 20 }}
            />
            {hasSpecialRequirements && (
              <View className="flex-row items-start gap-2 mt-3 pt-3 border-t border-neutral-100 bg-amber-50 rounded-xl p-3 -mx-1">
                <AlertTriangle size={14} color="#D97706" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-xs text-amber-800 leading-4">
                  Las suscripciones con necesidades especiales requieren aprobación manual del
                  conductor, independientemente de su configuración de auto-aprobación.
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Error banners */}
        {isStudentVerificationRequired && (
          <TouchableOpacity
            onPress={() => setShowVerificationSheet(true)}
            activeOpacity={0.8}
            className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex-row items-center gap-3"
          >
            <ShieldAlert size={20} color={Colors.semantic.error} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-red-700">Verificación estudiantil requerida</Text>
              <Text className="text-xs text-red-500 mt-0.5">Toca para ver opciones →</Text>
            </View>
          </TouchableOpacity>
        )}

        {isDuplicate && (
          <View className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 gap-2">
            <View className="flex-row items-center gap-2">
              <Info size={18} color="#D97706" />
              <Text className="text-sm font-bold text-amber-700">Ya tienes una suscripción activa</Text>
            </View>
            <Text className="text-xs text-amber-700 leading-4">
              Ya tienes una suscripción activa para esta ruta rutinaria.
            </Text>
            <TouchableOpacity onPress={() => router.back()} className="mt-1 self-start">
              <Text className="text-xs font-bold text-amber-700 underline">
                Ver mi suscripción →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {errors.global && !isStudentVerificationRequired && !isDuplicate && (
          <View className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-3">
            <Text className="text-sm text-red-700">{errors.global}</Text>
          </View>
        )}

        {/* Submit */}
        <View className="mx-4 mt-6 gap-3">
          <Button
            onPress={handleSubmit}
            disabled={isSubmitting}
            variant="primary"
          >
            {isSubmitting ? 'Enviando solicitud...' : 'Enviar solicitud'}
          </Button>
          {isSubmitting && (
            <ActivityIndicator size="small" color={Colors.primary[500]} style={{ marginTop: 8 }} />
          )}
          <TouchableOpacity
            onPress={handleContactDriver}
            activeOpacity={0.7}
            className="flex-row items-center justify-center gap-1.5 py-2"
          >
            <MessageCircle size={15} color={Colors.primary[600]} />
            <Text className="text-sm font-semibold text-primary-600">
              Escribirle al conductor antes
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mx-4 mt-4 flex-row items-start gap-2">
          <Info size={13} color={Colors.neutral[400]} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-xs text-neutral-400 leading-4">
            Al enviar la solicitud, el conductor será notificado y podrá aceptarla o rechazarla.
            Recibirás una notificación con su respuesta.
          </Text>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      <DatePickerModal
        visible={pickerTarget === 'startDate'}
        value={startDateObj ?? minStartDate}
        mode="date"
        title="Fecha de inicio"
        minimumDate={minStartDate}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerTarget(null)}
      />
      <DatePickerModal
        visible={pickerTarget === 'endDate'}
        value={endDateObj ?? (startDateObj ?? minStartDate)}
        mode="date"
        title="Fecha de fin"
        minimumDate={startDateObj ?? minStartDate}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerTarget(null)}
      />

      {/* Student verification gate */}
      <StudentVerificationModal
        visible={showVerificationSheet}
        onClose={() => setShowVerificationSheet(false)}
        universityName={universityName}
        universityId={universityId}
        hasPendingVerification={hasPendingVerification}
        insets={insets}
      />
    </KeyboardAvoidingView>
  );
}
