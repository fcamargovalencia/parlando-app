import { create } from 'zustand';
import { routineTripsApi } from '@/api/routine-trips';
import type {
  CreateRoutineTripRequest,
  RecurrenceDay,
  RoutineTripResponse,
  UniversityResponse,
} from '@/types/api';

// ── Form shape ──

export type RoutineCreateFormData = Partial<CreateRoutineTripRequest>;

const DEFAULT_FORM: RoutineCreateFormData = {
  currency: 'COP',
  allowsLuggage: true,
  studentsOnly: false,
  allowsCustomPickup: true,
  maxPickupDeviationMeters: 500,
  maxTimeOverheadSeconds: 300,
  autoApproveBookings: false,
  recurrenceDays: [] as RecurrenceDay[],
  availableSeats: 3,
  pricePerSeat: 0,
};

// ── Store shape ──

interface RoutineCreateState {
  formData: RoutineCreateFormData;
  /** Full university object for UI (not sent to API beyond universityId). */
  selectedUniversity: UniversityResponse | null;
  isSubmitting: boolean;
  errors: Record<string, string>;
  /** ID of the last successfully saved draft; used for the publish step. */
  lastCreatedId: string | null;

  updateForm: (fields: RoutineCreateFormData) => void;
  setSelectedUniversity: (university: UniversityResponse | null) => void;
  setErrors: (errors: Record<string, string>) => void;
  resetForm: () => void;
  saveDraft: () => Promise<RoutineTripResponse>;
  publishDraft: (id: string) => Promise<RoutineTripResponse>;
}

// ── Module-level store (persists across screen navigations) ──

const useRoutineCreateStore = create<RoutineCreateState>((set, get) => ({
  formData: { ...DEFAULT_FORM },
  selectedUniversity: null,
  isSubmitting: false,
  errors: {},
  lastCreatedId: null,

  updateForm: (fields) =>
    set((s) => ({ formData: { ...s.formData, ...fields } })),

  setSelectedUniversity: (university) => set({ selectedUniversity: university }),

  setErrors: (errors) => set({ errors }),

  resetForm: () =>
    set({
      formData: { ...DEFAULT_FORM },
      selectedUniversity: null,
      errors: {},
      lastCreatedId: null,
    }),

  saveDraft: async () => {
    const { formData } = get();
    set({ isSubmitting: true, errors: {} });
    try {
      const response = await routineTripsApi.create(formData as CreateRoutineTripRequest);
      const trip = response.data.data!;
      set({ lastCreatedId: trip.id });
      return trip;
    } finally {
      set({ isSubmitting: false });
    }
  },

  publishDraft: async (id: string) => {
    set({ isSubmitting: true });
    try {
      const response = await routineTripsApi.publish(id);
      return response.data.data!;
    } finally {
      set({ isSubmitting: false });
    }
  },
}));

// ── Per-step validation ──

export type StepKey = 1 | 2 | 3 | 4;

function validateStep(step: StepKey, data: RoutineCreateFormData): Record<string, string> {
  const errs: Record<string, string> = {};

  if (step === 1) {
    if (!data.originName) errs.origin = 'Selecciona un punto de origen';
    if (!data.destinationName) errs.destination = 'Selecciona un destino';
    if (!data.routePolyline?.length) errs.routePolyline = 'Traza la ruta antes de continuar';
  }

  if (step === 2) {
    if (!data.recurrenceDays?.length) errs.recurrenceDays = 'Selecciona al menos un día';
    if (!data.departureTime) errs.departureTime = 'Ingresa la hora de salida';
    if (!data.requiredArrivalTime) errs.requiredArrivalTime = 'Ingresa la hora límite de llegada';
    if (data.departureTime && data.requiredArrivalTime) {
      if (data.requiredArrivalTime <= data.departureTime) {
        errs.requiredArrivalTime = 'La hora límite de llegada debe ser posterior a la hora de salida';
      }
    }
    if (!data.validFrom) errs.validFrom = 'Selecciona la fecha de inicio';
    if (data.studentsOnly && !data.universityId) {
      errs.studentsOnly = 'Debes seleccionar una universidad en el Paso 1 para activar esta opción';
    }
  }

  if (step === 3) {
    if (!data.vehicleId) errs.vehicleId = 'Selecciona un vehículo';
    if (!data.availableSeats || data.availableSeats < 1) {
      errs.availableSeats = 'Indica al menos 1 cupo';
    }
    if (data.pricePerSeat === undefined || data.pricePerSeat < 0) {
      errs.pricePerSeat = 'Ingresa un precio válido';
    }
  }

  return errs;
}

// ── Public hook ──

export function usePublishRoutineTrip() {
  const store = useRoutineCreateStore();

  /** Validates the given step, stores errors and returns true if valid. */
  const validateAndProceed = (step: StepKey): boolean => {
    const errs = validateStep(step, store.formData);
    store.setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  return { ...store, validateAndProceed };
}
