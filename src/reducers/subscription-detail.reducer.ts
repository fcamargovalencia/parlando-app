export type SubscriptionModal = 'pause' | 'resume' | 'cancel';

export interface SubscriptionDetailState {
  activeModal: SubscriptionModal | null;
  isSubmitting: boolean;
  pauseFrom: string;
  pauseTo: string;
  pauseReason: string;
  hasPauseTo: boolean;
  showPauseFromPicker: boolean;
  showPauseToPicker: boolean;
  cancelReason: string;
  overrideName: string;
  overrideLat: string;
  overrideLng: string;
}

export type SubscriptionDetailAction =
  | { type: 'OPEN_PAUSE_MODAL'; payload: { pauseFrom: string; }; }
  | { type: 'OPEN_RESUME_MODAL'; }
  | { type: 'OPEN_CANCEL_MODAL'; }
  | { type: 'CLOSE_MODAL'; }
  | { type: 'SET_PAUSE_FROM'; payload: string; }
  | { type: 'SET_PAUSE_TO'; payload: string; }
  | { type: 'TOGGLE_HAS_PAUSE_TO'; }
  | { type: 'SET_PAUSE_REASON'; payload: string; }
  | { type: 'SHOW_PAUSE_FROM_PICKER'; }
  | { type: 'SHOW_PAUSE_TO_PICKER'; }
  | { type: 'HIDE_PICKERS'; }
  | { type: 'SET_CANCEL_REASON'; payload: string; }
  | { type: 'SET_OVERRIDE_NAME'; payload: string; }
  | { type: 'SET_OVERRIDE_LAT'; payload: string; }
  | { type: 'SET_OVERRIDE_LNG'; payload: string; }
  | { type: 'SET_SUBMITTING'; payload: boolean; };

export const initialSubscriptionDetailState: SubscriptionDetailState = {
  activeModal: null,
  isSubmitting: false,
  pauseFrom: '',
  pauseTo: '',
  pauseReason: '',
  hasPauseTo: false,
  showPauseFromPicker: false,
  showPauseToPicker: false,
  cancelReason: '',
  overrideName: '',
  overrideLat: '',
  overrideLng: '',
};

export function subscriptionDetailReducer(
  state: SubscriptionDetailState,
  action: SubscriptionDetailAction,
): SubscriptionDetailState {
  switch (action.type) {
    case 'OPEN_PAUSE_MODAL':
      return {
        ...state,
        activeModal: 'pause',
        pauseFrom: action.payload.pauseFrom,
        pauseTo: '',
        pauseReason: '',
        hasPauseTo: false,
        showPauseFromPicker: false,
        showPauseToPicker: false,
      };
    case 'OPEN_RESUME_MODAL':
      return { ...state, activeModal: 'resume' };
    case 'OPEN_CANCEL_MODAL':
      return { ...state, activeModal: 'cancel', cancelReason: '' };
    case 'CLOSE_MODAL':
      return { ...state, activeModal: null, showPauseFromPicker: false, showPauseToPicker: false };
    case 'SET_PAUSE_FROM':
      return { ...state, pauseFrom: action.payload };
    case 'SET_PAUSE_TO':
      return { ...state, pauseTo: action.payload };
    case 'TOGGLE_HAS_PAUSE_TO':
      return { ...state, hasPauseTo: !state.hasPauseTo };
    case 'SET_PAUSE_REASON':
      return { ...state, pauseReason: action.payload };
    case 'SHOW_PAUSE_FROM_PICKER':
      return { ...state, showPauseFromPicker: true, showPauseToPicker: false };
    case 'SHOW_PAUSE_TO_PICKER':
      return { ...state, showPauseToPicker: true, showPauseFromPicker: false };
    case 'HIDE_PICKERS':
      return { ...state, showPauseFromPicker: false, showPauseToPicker: false };
    case 'SET_CANCEL_REASON':
      return { ...state, cancelReason: action.payload };
    case 'SET_OVERRIDE_NAME':
      return { ...state, overrideName: action.payload };
    case 'SET_OVERRIDE_LAT':
      return { ...state, overrideLat: action.payload };
    case 'SET_OVERRIDE_LNG':
      return { ...state, overrideLng: action.payload };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    default:
      return state;
  }
}
