import type { RateTarget } from '@/hooks/useTripDetailScreen';

type TripModal = 'edit' | 'book' | 'map';

interface TripDetailUIState {
  activeModal: TripModal | null;
  rateTarget: RateTarget | null;
}

type TripDetailUIAction =
  | { type: 'OPEN_MODAL'; modal: TripModal }
  | { type: 'CLOSE_MODAL' }
  | { type: 'OPEN_RATE'; target: RateTarget }
  | { type: 'CLOSE_RATE' };

export const initialTripDetailUIState: TripDetailUIState = {
  activeModal: null,
  rateTarget: null,
};

export function tripDetailUIReducer(
  state: TripDetailUIState,
  action: TripDetailUIAction,
): TripDetailUIState {
  switch (action.type) {
    case 'OPEN_MODAL':
      return { ...state, activeModal: action.modal };
    case 'CLOSE_MODAL':
      return { ...state, activeModal: null };
    case 'OPEN_RATE':
      return { ...state, rateTarget: action.target };
    case 'CLOSE_RATE':
      return { ...state, rateTarget: null };
  }
}
