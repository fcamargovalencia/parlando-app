import type { BookingResponse } from '@/types/api';

/**
 * Merges an updated BookingResponse from an action endpoint (accept, reject, board, no-show)
 * with the existing booking in state. Action endpoints typically return scalar fields only
 * and omit relation fields (passenger, trip). This helper preserves those relations from
 * the existing booking so they are not lost in the UI.
 */
export function mergeBooking(existing: BookingResponse, updated: BookingResponse): BookingResponse {
  return {
    ...updated,
    passenger: updated.passenger ?? existing.passenger,
    trip: updated.trip ?? existing.trip,
  };
}
