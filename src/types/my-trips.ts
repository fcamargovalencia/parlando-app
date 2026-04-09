import type { BookingResponse, TripResponse, TripType } from './api';

// ── Unified filter ──

export type MyTripFilter = 'active' | 'past' | 'cancelled';

export type MyTripRole = 'driver' | 'passenger';

export type MyTripRatingStatus = 'none' | 'pending' | 'done';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

// ── Unified list item ──

/**
 * Normalized row used by the "Mis viajes" screen. Both driver-owned trips and
 * passenger bookings are mapped into this shape so a single card component can
 * render them. The original source is kept in `trip` / `booking` for the few
 * fields a consumer might still need (ids, raw status, etc.).
 */
export interface MyTripItem {
  /** Stable key for FlatList (prefixed to avoid collisions between sources) */
  key: string;
  /** Whether the current user participates as driver or passenger */
  role: MyTripRole;
  /** Trip id used for navigation to /trip/[id] */
  tripId: string;
  /** Normalized filter category (active / past / cancelled) */
  category: MyTripFilter;

  // ── Status ──
  statusBadge: { label: string; variant: BadgeVariant; };

  // ── Route & type ──
  tripType: TripType;
  originName: string;
  originSubtitle?: string | null;
  destinationName: string;
  destinationSubtitle?: string | null;

  // ── Time ──
  departureAt: string;
  estimatedArrivalAt?: string | null;

  // ── Price & prefs ──
  pricePerSeat: number;
  currency: string;
  allowsLuggage: boolean;

  // ── Seats metric (contextual label) ──
  seats: { count: number; label: string; };

  // ── Driver-only extras (undefined for passenger rows) ──
  studentsOnly?: boolean;
  stopCount?: number;

  // ── Actions & state ──
  canCancel: boolean;
  ratingStatus: MyTripRatingStatus;

  // ── Raw sources (for callbacks that need original data) ──
  trip?: TripResponse;
  booking?: BookingResponse;
}
