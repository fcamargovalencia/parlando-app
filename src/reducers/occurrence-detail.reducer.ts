export type OccurrenceModal = 'map' | 'noShowConfirm' | 'overridePickup' | 'cancelConfirm';

export interface OccurrenceDetailState {
  activeModal: OccurrenceModal | null;
  selectedBookingId: string | null;
  isSubmitting: boolean;
  pendingOverrideLat: number | null;
  pendingOverrideLng: number | null;
  pendingOverrideName: string | null;
}

export type OccurrenceDetailAction =
  | { type: 'OPEN_MAP'; }
  | { type: 'OPEN_NO_SHOW'; payload: { bookingId: string; }; }
  | { type: 'OPEN_OVERRIDE_PICKUP'; payload: { bookingId: string; }; }
  | { type: 'SET_OVERRIDE_LOCATION'; payload: { lat: number; lng: number; name: string; }; }
  | { type: 'OPEN_CANCEL_CONFIRM'; }
  | { type: 'CLOSE_MODAL'; }
  | { type: 'SET_SUBMITTING'; payload: boolean; };

export const initialOccurrenceDetailState: OccurrenceDetailState = {
  activeModal: null,
  selectedBookingId: null,
  isSubmitting: false,
  pendingOverrideLat: null,
  pendingOverrideLng: null,
  pendingOverrideName: null,
};

export function occurrenceDetailReducer(
  state: OccurrenceDetailState,
  action: OccurrenceDetailAction,
): OccurrenceDetailState {
  switch (action.type) {
    case 'OPEN_MAP':
      return { ...state, activeModal: 'map' };
    case 'OPEN_NO_SHOW':
      return { ...state, activeModal: 'noShowConfirm', selectedBookingId: action.payload.bookingId };
    case 'OPEN_OVERRIDE_PICKUP':
      return {
        ...state,
        activeModal: 'overridePickup',
        selectedBookingId: action.payload.bookingId,
        pendingOverrideLat: null,
        pendingOverrideLng: null,
        pendingOverrideName: null,
      };
    case 'SET_OVERRIDE_LOCATION':
      return {
        ...state,
        pendingOverrideLat: action.payload.lat,
        pendingOverrideLng: action.payload.lng,
        pendingOverrideName: action.payload.name,
      };
    case 'OPEN_CANCEL_CONFIRM':
      return { ...state, activeModal: 'cancelConfirm' };
    case 'CLOSE_MODAL':
      return { ...state, activeModal: null, selectedBookingId: null };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    default:
      return state;
  }
}
