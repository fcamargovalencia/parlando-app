import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Calendar,
  ChevronLeft,
  Clock,
  Info,
  MapPin,
  ShieldAlert,
  Users,
} from 'lucide-react-native';
import { Button, Card, DatePickerModal, Spinner } from '@/components/ui';
import { DaySelector } from '@/components/routine/DaySelector';
import { PickupTypeSelector, type PickupSelection } from '@/components/routine/PickupTypeSelector';
import { RoutePreview } from '@/components/RoutePreview';
import { Colors } from '@/constants/colors';
import { formatCurrency } from '@/lib/utils';
import { useRoutineSubscription } from '@/hooks/useRoutineSubscription';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import type { RecurrenceDay } from '@/types/api';

// ── Helpers ──

function dateToISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseISODate(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

type PickerTarget = 'startDate' | 'endDate';

// ── Screen ──

export default function NewSubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { routineTripId, routeLine: routeLineParam } = useLocalSearchParams<{ routineTripId: string; routeLine?: string; }>();

  const {
    routineTrip: routineTripRaw,
    waypoints,
    formData,
    updateForm,
    previewDeviation,
    submit,
    isLoading,
    isSubmitting,
    errors,
    loadingError,
  } = useRoutineSubscription(routineTripId!);

  const routineTrip = routineTripRaw && !routineTripRaw.routeLine && routeLineParam
    ? { ...routineTripRaw, routeLine: JSON.parse(routeLineParam) as [number, number][] }
    : routineTripRaw;

  const [pickupSelection, setPickupSelection] = useState<PickupSelection | null>(null);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [showVerificationSheet, setShowVerificationSheet] = useState(false);

  const { fetch: fetchVerifications, getForUniversity } = useStudentVerification();

  // Pre-load verifications so the gate sheet can show the right state
  useEffect(() => {
    void fetchVerifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Date picker values ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDateObj = formData.startDate ? parseISODate(formData.startDate) : undefined;
  const endDateObj = formData.endDate ? parseISODate(formData.endDate) : undefined;
  const minStartDate = routineTrip?.validFrom ? parseISODate(routineTrip.validFrom) : today;

  const handlePickerConfirm = useCallback(
    (date: Date) => {
      if (pickerTarget === 'startDate') {
        updateForm({ startDate: dateToISODate(date) });
      } else if (pickerTarget === 'endDate') {
        updateForm({ endDate: dateToISODate(date) });
      }
      setPickerTarget(null);
    },
    [pickerTarget, updateForm],
  );

  const handleDaysChange = useCallback(
    (days: RecurrenceDay[]) => {
      updateForm({ subscribedDays: days });
    },
    [updateForm],
  );

  const handlePickupSelect = useCallback(
    (config: PickupSelection) => {
      setPickupSelection(config);
      updateForm({
        pickupWaypointId: config.pickupWaypointId,
        customPickupLatitude: config.customPickupLatitude,
        customPickupLongitude: config.customPickupLongitude,
        customPickupName: config.customPickupName,
      });
    },
    [updateForm],
  );

  const handleToggleEndDate = useCallback(() => {
    setHasEndDate((prev) => {
      if (prev) updateForm({ endDate: undefined });
      return !prev;
    });
  }, [updateForm]);

  const handleSeatsChange = useCallback(
    (text: string) => {
      const n = parseInt(text, 10);
      if (!isNaN(n) && n >= 1) updateForm({ seatsRequired: n });
      else if (text === '') updateForm({ seatsRequired: 1 });
    },
    [updateForm],
  );

  const handleSpecialRequirementsChange = useCallback(
    (text: string) => {
      updateForm({ specialRequirements: text || undefined });
    },
    [updateForm],
  );

  const handleSubmit = useCallback(async () => {
    try {
      await submit();
      router.replace({
        pathname: '/(tabs)/my-trips',
        params: { successMessage: 'Solicitud enviada. El conductor responderá pronto.' },
      });
    } catch {
      // errors are set inside the hook
    }
  }, [submit, router]);

  // ── Global error states ──
  const globalError = errors.global;
  const isStudentVerificationRequired = globalError === 'STUDENT_VERIFICATION_REQUIRED';
  const isDuplicate = globalError === 'DUPLICATE_SUBSCRIPTION';

  // Open the verification sheet whenever the 403 gate is hit
  useEffect(() => {
    if (isStudentVerificationRequired) setShowVerificationSheet(true);
  }, [isStudentVerificationRequired]);

  const universityId = routineTrip?.universityId;
  const existingVerification = universityId ? getForUniversity(universityId) : undefined;
  const hasPendingVerification = existingVerification?.status === 'PENDING';
  const universityName = routineTrip?.destinationName ?? 'esta universidad';

  // ── Loading / Error states ──
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
      {/* Header */}
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
        {/* Route summary card */}
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

        {/* ── Sección 1: Punto de recogida ── */}
        <View className="mx-4 mt-5">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
              <Text className="text-xs font-bold text-white">1</Text>
            </View>
            <Text className="text-base font-bold text-neutral-900">Punto de recogida</Text>
          </View>

          <PickupTypeSelector
            routineTrip={routineTrip}
            waypoints={waypoints}
            selection={pickupSelection}
            onSelect={handlePickupSelect}
            previewDeviation={previewDeviation}
            error={errors.pickup}
          />
        </View>

        {/* ── Sección 2: Días, fechas y cupos ── */}
        <View className="mx-4 mt-6">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
              <Text className="text-xs font-bold text-white">2</Text>
            </View>
            <Text className="text-base font-bold text-neutral-900">Configuración</Text>
          </View>

          <Card className="p-4 gap-4">
            {/* Days */}
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

            {/* Start date */}
            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-1.5">
                Fecha de inicio
              </Text>
              <TouchableOpacity
                onPress={() => setPickerTarget('startDate')}
                activeOpacity={0.7}
                className={`flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border ${errors.startDate ? 'border-red-400 bg-red-50' : 'border-neutral-200 bg-white'
                  }`}
              >
                <Calendar size={16} color={errors.startDate ? Colors.semantic.error : Colors.neutral[400]} />
                <Text
                  className={`text-base flex-1 ${formData.startDate ? 'text-neutral-900' : 'text-neutral-400'
                    }`}
                >
                  {startDateObj ? fmtDate(startDateObj) : 'Seleccionar fecha...'}
                </Text>
              </TouchableOpacity>
              {errors.startDate && (
                <Text className="text-red-500 text-xs mt-1">{errors.startDate}</Text>
              )}
            </View>

            {/* End date toggle */}
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
                  className={`w-12 h-7 rounded-full justify-center px-0.5 ${hasEndDate ? 'bg-primary-500' : 'bg-neutral-200'
                    }`}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white ${hasEndDate ? 'self-end' : 'self-start'
                      }`}
                    style={{ elevation: 2 }}
                  />
                </TouchableOpacity>
              </View>

              {hasEndDate && (
                <TouchableOpacity
                  onPress={() => setPickerTarget('endDate')}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border border-neutral-200 bg-white mt-3"
                >
                  <Calendar size={16} color={Colors.neutral[400]} />
                  <Text
                    className={`text-base flex-1 ${formData.endDate ? 'text-neutral-900' : 'text-neutral-400'
                      }`}
                  >
                    {endDateObj ? fmtDate(endDateObj) : 'Seleccionar fecha de fin...'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Seats required */}
            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-1.5">
                Cupos requeridos
              </Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={() =>
                    updateForm({ seatsRequired: Math.max(1, (formData.seatsRequired ?? 1) - 1) })
                  }
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
                  onPress={() =>
                    updateForm({
                      seatsRequired: Math.min(
                        routineTrip.availableSeats,
                        (formData.seatsRequired ?? 1) + 1,
                      ),
                    })
                  }
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

        {/* ── Sección 3: Necesidades especiales ── */}
        <View className="mx-4 mt-6">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
              <Text className="text-xs font-bold text-white">3</Text>
            </View>
            <Text className="text-base font-bold text-neutral-900">Necesidades especiales</Text>
          </View>

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

        {/* ── Error banners ── */}
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

        {globalError &&
          !isStudentVerificationRequired &&
          !isDuplicate && (
            <View className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-3">
              <Text className="text-sm text-red-700">{globalError}</Text>
            </View>
          )}

        {/* ── Submit ── */}
        <View className="mx-4 mt-6">
          <Button
            title={isSubmitting ? 'Enviando solicitud...' : 'Enviar solicitud'}
            onPress={handleSubmit}
            disabled={isSubmitting}
            variant="primary"
          />
          {isSubmitting && (
            <ActivityIndicator
              size="small"
              color={Colors.primary[500]}
              style={{ marginTop: 8 }}
            />
          )}
        </View>

        {/* Info note */}
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

      {/* ── Student verification gate BottomSheet ── */}
      <Modal
        visible={showVerificationSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVerificationSheet(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: Colors.overlay }}
          activeOpacity={1}
          onPress={() => setShowVerificationSheet(false)}
        />
        <View
          style={{
            backgroundColor: Colors.white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
            paddingTop: 20,
          }}
        >
          {/* Drag handle */}
          <View className="w-10 h-1 rounded-full bg-neutral-200 self-center mb-5" />

          {/* Icon + title */}
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-12 h-12 rounded-2xl bg-red-50 items-center justify-center">
              <ShieldAlert size={24} color={Colors.semantic.error} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-neutral-900">
                Verificación estudiantil requerida
              </Text>
              <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={2}>
                Esta ruta es exclusiva para estudiantes verificados de {universityName}
              </Text>
            </View>
          </View>

          {hasPendingVerification ? (
            <View className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center gap-2 mb-1">
                <Clock size={16} color={Colors.semantic.warning} />
                <Text className="text-sm font-semibold text-yellow-800">En revisión</Text>
              </View>
              <Text className="text-xs text-yellow-700 leading-4">
                Tu verificación está en revisión. Recibirás una notificación cuando sea aprobada.
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-sm text-neutral-600 leading-5 mb-5">
                Para suscribirte necesitas verificar tu condición de estudiante universitario.
                El proceso es rápido: solo necesitas tu carnet y tu correo institucional.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowVerificationSheet(false);
                  router.push(
                    universityId
                      ? { pathname: '/student-verification/submit', params: { universityId } }
                      : '/student-verification/submit',
                  );
                }}
                activeOpacity={0.85}
                className="bg-primary-500 rounded-2xl py-4 items-center mb-3"
              >
                <Text className="text-base font-bold text-white">Verificar ahora</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => setShowVerificationSheet(false)}
            activeOpacity={0.7}
            className="py-3 items-center"
          >
            <Text className="text-sm font-medium text-neutral-500">Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
