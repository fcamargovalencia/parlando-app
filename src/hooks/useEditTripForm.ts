import { useState, useActionState } from 'react';
import Toast from 'react-native-toast-message';
import { tripsApi } from '@/api/trips';
import type { TripResponse, UpdateTripRequest } from '@/types/api';

interface EditFormState {
  availableSeats: string;
  pricePerSeat: string;
  departureAt: Date;
  allowsLuggage: boolean;
  studentsOnly: boolean;
}

export function useEditTripForm(
  trip: TripResponse,
  onSaved: (updated: TripResponse) => void,
  onClose: () => void,
) {
  const [form, setForm] = useState<EditFormState>({
    availableSeats: String(trip.availableSeats),
    pricePerSeat: String(Math.round(trip.pricePerSeat)),
    departureAt: new Date(trip.departureAt),
    allowsLuggage: trip.allowsLuggage,
    studentsOnly: trip.studentsOnly,
  });
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const [formError, save, isSaving] = useActionState(
    async (_prev: string | null): Promise<string | null> => {
      const seats = parseInt(form.availableSeats, 10);
      const price = parseFloat(form.pricePerSeat);

      if (!seats || seats < 1) return 'Ingresa un número de asientos válido';
      if (!price || price < 1) return 'Ingresa un precio válido';
      if (form.departureAt <= new Date()) return 'La salida debe ser en el futuro';

      try {
        const body: UpdateTripRequest = {
          availableSeats: seats,
          pricePerSeat: price,
          departureAt: form.departureAt.toISOString(),
          allowsLuggage: form.allowsLuggage,
          studentsOnly: form.studentsOnly,
        };
        const { data: res } = await tripsApi.update(trip.id, body);
        if (!res.data) throw new Error();
        onSaved(res.data);
        Toast.show({ type: 'success', text1: 'Viaje actualizado' });
        onClose();
        return null;
      } catch (err: any) {
        return err?.response?.data?.message ?? 'No se pudo actualizar el viaje';
      }
    },
    null,
  );

  const handleDateChange = (_: unknown, date?: Date) => {
    if (!date) return;
    const next = new Date(date);
    next.setHours(form.departureAt.getHours(), form.departureAt.getMinutes(), 0, 0);
    setForm((f) => ({ ...f, departureAt: next }));
    setShowDate(false);
  };

  const handleTimeChange = (_: unknown, date?: Date) => {
    if (!date) return;
    const next = new Date(form.departureAt);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setForm((f) => ({ ...f, departureAt: next }));
    setShowTime(false);
  };

  return {
    form,
    setForm,
    showDate,
    setShowDate,
    showTime,
    setShowTime,
    handleDateChange,
    handleTimeChange,
    formError,
    save,
    isSaving,
  };
}
