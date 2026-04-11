import type {
  TripResponse,
  VehicleResponse,
  BookingResponse,
  RouteWaypointResponse,
} from '@/types/api';

// ── State ──

export interface TripDetailState {
  // Primary
  trip: TripResponse | null;
  loading: boolean;
  error: string | null;
  // Secondary (loaded in parallel after trip)
  vehicle: VehicleResponse | null;
  bookings: BookingResponse[];
  myBooking: BookingResponse | null | undefined; // undefined = not yet fetched
  actionLoading: string | null;
  // Ratings
  ratedUserIds: Set<string>;
  driverCommentCount: number | null;
  passengerCommentCounts: Record<string, number>;
  // Route map (lazy)
  waypointsFull: RouteWaypointResponse[];
  loadingWaypoints: boolean;
  routePolyline: Array<{ latitude: number; longitude: number }>;
  loadingRoutePolyline: boolean;
}

export function createInitialState(fromSearch: boolean): TripDetailState {
  return {
    trip: null,
    loading: true,
    error: null,
    vehicle: null,
    bookings: [],
    myBooking: fromSearch ? null : undefined,
    actionLoading: null,
    ratedUserIds: new Set(),
    driverCommentCount: null,
    passengerCommentCounts: {},
    waypointsFull: [],
    loadingWaypoints: false,
    routePolyline: [],
    loadingRoutePolyline: false,
  };
}

// ── Actions ──

export type TripDetailAction =
  // Primary load
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; trip: TripResponse }
  | { type: 'LOAD_ERROR'; error: string }
  // Secondary data
  | { type: 'SET_VEHICLE'; vehicle: VehicleResponse }
  | { type: 'SET_BOOKINGS'; bookings: BookingResponse[] }
  | { type: 'SET_MY_BOOKING'; myBooking: BookingResponse | null }
  | { type: 'SET_RATED_USER_IDS'; ratedUserIds: Set<string> }
  | { type: 'SET_DRIVER_COMMENT_COUNT'; count: number }
  | { type: 'SET_PASSENGER_COMMENT_COUNTS'; counts: Record<string, number> }
  // Async action lifecycle
  | { type: 'ACTION_START'; label: string }
  | { type: 'ACTION_END' }
  // Trip mutations
  | { type: 'UPDATE_TRIP'; trip: TripResponse | null }
  | { type: 'CANCEL_TRIP' }
  // Booking mutations
  | { type: 'UPDATE_BOOKING'; bookingId: string; booking: BookingResponse }
  | { type: 'UPDATE_MY_BOOKING'; myBooking: BookingResponse }
  | { type: 'CANCEL_MY_BOOKING' }
  // Ratings
  | { type: 'ADD_RATED_USER'; userId: string }
  // Map (lazy loaded)
  | { type: 'MAP_LOAD_START'; needsWaypoints: boolean; needsPolyline: boolean }
  | { type: 'SET_WAYPOINTS'; waypoints: RouteWaypointResponse[] }
  | { type: 'SET_ROUTE_POLYLINE'; polyline: Array<{ latitude: number; longitude: number }> }
  | { type: 'MAP_LOAD_END'; needsWaypoints: boolean; needsPolyline: boolean };

// ── Reducer ──

export function tripDetailReducer(
  state: TripDetailState,
  action: TripDetailAction,
): TripDetailState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_SUCCESS':
      return { ...state, loading: false, trip: action.trip };
    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.error };

    case 'SET_VEHICLE':
      return { ...state, vehicle: action.vehicle };
    case 'SET_BOOKINGS':
      return { ...state, bookings: action.bookings };
    case 'SET_MY_BOOKING':
      return { ...state, myBooking: action.myBooking };
    case 'SET_RATED_USER_IDS':
      return { ...state, ratedUserIds: action.ratedUserIds };
    case 'SET_DRIVER_COMMENT_COUNT':
      return { ...state, driverCommentCount: action.count };
    case 'SET_PASSENGER_COMMENT_COUNTS':
      return { ...state, passengerCommentCounts: action.counts };

    case 'ACTION_START':
      return { ...state, actionLoading: action.label };
    case 'ACTION_END':
      return { ...state, actionLoading: null };

    case 'UPDATE_TRIP':
      return { ...state, trip: action.trip };
    case 'CANCEL_TRIP':
      return {
        ...state,
        trip: state.trip ? { ...state.trip, status: 'CANCELLED' } : null,
      };

    case 'UPDATE_BOOKING':
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.bookingId ? action.booking : b,
        ),
      };
    case 'UPDATE_MY_BOOKING':
      return { ...state, myBooking: action.myBooking };
    case 'CANCEL_MY_BOOKING':
      return {
        ...state,
        myBooking: state.myBooking
          ? { ...state.myBooking, status: 'CANCELLED' }
          : state.myBooking,
      };

    case 'ADD_RATED_USER':
      return {
        ...state,
        ratedUserIds: new Set([...state.ratedUserIds, action.userId]),
      };

    case 'MAP_LOAD_START':
      return {
        ...state,
        loadingWaypoints: action.needsWaypoints ? true : state.loadingWaypoints,
        loadingRoutePolyline: action.needsPolyline ? true : state.loadingRoutePolyline,
      };
    case 'SET_WAYPOINTS':
      return { ...state, waypointsFull: action.waypoints };
    case 'SET_ROUTE_POLYLINE':
      return { ...state, routePolyline: action.polyline };
    case 'MAP_LOAD_END':
      return {
        ...state,
        loadingWaypoints: action.needsWaypoints ? false : state.loadingWaypoints,
        loadingRoutePolyline: action.needsPolyline ? false : state.loadingRoutePolyline,
      };
  }
}
