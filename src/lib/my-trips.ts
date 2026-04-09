import { BOOKING_STATUS_BADGE, TRIP_STATUS_BADGE } from '@/constants/trips';
import type {
  BookingResponse,
  BookingStatus,
  TripResponse,
  TripStatus,
} from '@/types/api';
import type {
  MyTripFilter,
  MyTripItem,
  MyTripRatingStatus,
} from '@/types/my-trips';

// ── Category mapping ──

const TRIP_CATEGORY: Record<TripStatus, MyTripFilter> = {
  DRAFT: 'active',
  PUBLISHED: 'active',
  IN_PROGRESS: 'active',
  COMPLETED: 'past',
  CANCELLED: 'cancelled',
};

const BOOKING_CATEGORY: Record<BookingStatus, MyTripFilter> = {
  PENDING: 'active',
  ACCEPTED: 'active',
  BOARDED: 'active',
  COMPLETED: 'past',
  CANCELLED: 'cancelled',
  REJECTED: 'cancelled',
  NO_SHOW: 'cancelled',
};

export function categoryForTrip(status: TripStatus): MyTripFilter {
  return TRIP_CATEGORY[status];
}

export function categoryForBooking(status: BookingStatus): MyTripFilter {
  return BOOKING_CATEGORY[status];
}

// ── Seat label helpers ──

function seatsLabel(count: number): string {
  return count === 1 ? 'asiento' : 'asientos';
}

// ── Driver rating status ──

const RATEABLE_BOOKING_STATUSES = new Set<BookingStatus>(['COMPLETED', 'BOARDED']);

function driverRatingStatus(bookings: BookingResponse[] | undefined): MyTripRatingStatus {
  if (!bookings) return 'none';
  const rateable = bookings.filter((b) => RATEABLE_BOOKING_STATUSES.has(b.status));
  if (rateable.length === 0) return 'none';
  return rateable.every((b) => b.passengerRatingId != null) ? 'done' : 'pending';
}

function passengerRatingStatus(
  booking: BookingResponse,
  locallyRated: boolean,
): MyTripRatingStatus {
  if (booking.status !== 'COMPLETED') return 'none';
  if (locallyRated || booking.driverRatingId) return 'done';
  return 'pending';
}

// ── Mappers ──

export function mapTripToItem(
  trip: TripResponse,
  tripBookings?: BookingResponse[],
): MyTripItem {
  const badge = TRIP_STATUS_BADGE[trip.status] ?? { label: trip.status, variant: 'neutral' as const };
  const stopCount = trip.waypoints?.filter((w) => w.isPickupPoint).length ?? 0;

  return {
    key: `trip-${trip.id}`,
    role: 'driver',
    tripId: trip.id,
    category: categoryForTrip(trip.status),
    statusBadge: badge,
    tripType: trip.tripType,
    originName: trip.originName,
    originSubtitle: trip.originSubtitle,
    destinationName: trip.destinationName,
    destinationSubtitle: trip.destinationSubtitle,
    departureAt: trip.departureAt,
    estimatedArrivalAt: null,
    pricePerSeat: trip.pricePerSeat,
    currency: trip.currency,
    allowsLuggage: trip.allowsLuggage,
    seats: {
      count: trip.availableSeats,
      label: `${trip.availableSeats} ${seatsLabel(trip.availableSeats)} disponibles`,
    },
    studentsOnly: trip.studentsOnly,
    stopCount: stopCount > 0 ? stopCount : undefined,
    canCancel: trip.status === 'DRAFT' || trip.status === 'PUBLISHED',
    ratingStatus: trip.status === 'COMPLETED' ? driverRatingStatus(tripBookings) : 'none',
    trip,
  };
}

export function mapBookingToItem(
  booking: BookingResponse,
  locallyRated: boolean,
): MyTripItem {
  const badge = BOOKING_STATUS_BADGE[booking.status];
  const trip = booking.trip;

  return {
    key: `booking-${booking.id}`,
    role: 'passenger',
    tripId: booking.tripId,
    category: categoryForBooking(booking.status),
    statusBadge: badge,
    tripType: trip?.tripType ?? 'ROUTINE',
    originName: trip?.originName ?? '—',
    originSubtitle: trip?.originSubtitle,
    destinationName: trip?.destinationName ?? '—',
    destinationSubtitle: trip?.destinationSubtitle,
    departureAt: trip?.departureAt ?? booking.createdAt,
    estimatedArrivalAt: trip?.estimatedArrivalAt,
    pricePerSeat: trip?.pricePerSeat ?? 0,
    currency: trip?.currency ?? 'COP',
    allowsLuggage: trip?.allowsLuggage ?? false,
    seats: {
      count: booking.seatsBooked,
      label: `${booking.seatsBooked} ${seatsLabel(booking.seatsBooked)} reservado${booking.seatsBooked === 1 ? '' : 's'}`,
    },
    canCancel: booking.status === 'PENDING' || booking.status === 'ACCEPTED',
    ratingStatus: passengerRatingStatus(booking, locallyRated),
    booking,
  };
}

// ── Sorting ──

/**
 * Merges driver trips and passenger bookings into a single timeline.
 * - Active items are sorted by nearest departure first.
 * - Past / cancelled items are sorted by most recent departure first.
 */
export function sortItems(items: MyTripItem[], filter: MyTripFilter): MyTripItem[] {
  return [...items].sort((a, b) => {
    const da = new Date(a.departureAt).getTime();
    const db = new Date(b.departureAt).getTime();
    return filter === 'active' ? da - db : db - da;
  });
}
