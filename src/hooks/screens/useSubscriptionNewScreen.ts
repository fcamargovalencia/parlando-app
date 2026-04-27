import { useState, useCallback, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRoutineSubscription } from '@/hooks/useRoutineSubscription';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import type { PickupSelection } from '@/components/routine/PickupTypeSelector';
import type { RecurrenceDay } from '@/types/api';

type PickerTarget = 'startDate' | 'endDate';

function parseISODate(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function dateToISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function useSubscriptionNewScreen() {
  const router = useRouter();
  const { routineTripId, routeLine: routeLineParam } = useLocalSearchParams<{
    routineTripId: string;
    routeLine?: string;
  }>();

  const subscription = useRoutineSubscription(routineTripId!);
  const { fetch: fetchVerifications, getForUniversity } = useStudentVerification();

  const [pickupSelection, setPickupSelection] = useState<PickupSelection | null>(null);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [showVerificationSheet, setShowVerificationSheet] = useState(false);

  useEffect(() => {
    void fetchVerifications();
  }, [fetchVerifications]);

  const routineTrip = subscription.routineTrip && !subscription.routineTrip.routeLine && routeLineParam
    ? { ...subscription.routineTrip, routeLine: JSON.parse(routeLineParam) as [number, number][] }
    : subscription.routineTrip;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDateObj = subscription.formData.startDate
    ? parseISODate(subscription.formData.startDate)
    : undefined;
  const endDateObj = subscription.formData.endDate
    ? parseISODate(subscription.formData.endDate)
    : undefined;
  const minStartDate = routineTrip?.validFrom ? parseISODate(routineTrip.validFrom) : today;

  const handlePickerConfirm = useCallback(
    (date: Date) => {
      if (pickerTarget === 'startDate') {
        subscription.updateForm({ startDate: dateToISODate(date) });
      } else if (pickerTarget === 'endDate') {
        subscription.updateForm({ endDate: dateToISODate(date) });
      }
      setPickerTarget(null);
    },
    [pickerTarget, subscription.updateForm],
  );

  const handleDaysChange = useCallback(
    (days: RecurrenceDay[]) => subscription.updateForm({ subscribedDays: days }),
    [subscription.updateForm],
  );

  const handlePickupSelect = useCallback(
    (config: PickupSelection) => {
      setPickupSelection(config);
      subscription.updateForm({
        pickupType: config.pickupType,
        pickupWaypointId: config.pickupWaypointId,
        customPickupLatitude: config.customPickupLatitude,
        customPickupLongitude: config.customPickupLongitude,
        customPickupName: config.customPickupName,
      });
    },
    [subscription.updateForm],
  );

  const handleToggleEndDate = useCallback(() => {
    setHasEndDate((prev) => {
      if (prev) subscription.updateForm({ endDate: undefined });
      return !prev;
    });
  }, [subscription.updateForm]);

  const handleSeatsChange = useCallback(
    (text: string) => {
      const n = parseInt(text, 10);
      if (!isNaN(n) && n >= 1) subscription.updateForm({ seatsRequired: n });
      else if (text === '') subscription.updateForm({ seatsRequired: 1 });
    },
    [subscription.updateForm],
  );

  const handleSpecialRequirementsChange = useCallback(
    (text: string) => subscription.updateForm({ specialRequirements: text || undefined }),
    [subscription.updateForm],
  );

  const handleSubmit = useCallback(async () => {
    try {
      await subscription.submit();
      router.replace({
        pathname: '/(tabs)/my-trips',
        params: { successMessage: 'Solicitud enviada. El conductor responderá pronto.' },
      });
    } catch {
      // errors set inside hook
    }
  }, [subscription.submit, router]);

  const globalError = subscription.errors.global;
  const isStudentVerificationRequired = globalError === 'STUDENT_VERIFICATION_REQUIRED';
  const isDuplicate = globalError === 'DUPLICATE_SUBSCRIPTION';

  useEffect(() => {
    if (isStudentVerificationRequired) setShowVerificationSheet(true);
  }, [isStudentVerificationRequired]);

  const universityId = routineTrip?.universityId;
  const existingVerification = universityId ? getForUniversity(universityId) : undefined;
  const hasPendingVerification = existingVerification?.status === 'PENDING';
  const universityName = routineTrip?.destinationName ?? 'esta universidad';

  return {
    routineTrip,
    waypoints: subscription.waypoints,
    formData: subscription.formData,
    errors: subscription.errors,
    isLoading: subscription.isLoading,
    isSubmitting: subscription.isSubmitting,
    loadingError: subscription.loadingError,
    updateForm: subscription.updateForm,
    previewDeviation: subscription.previewDeviation,
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
  };
}
