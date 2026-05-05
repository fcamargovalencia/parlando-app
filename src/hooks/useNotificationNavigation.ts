import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import type { NotificationResponse } from 'expo-notifications';

// ── Notification payload data shape sent by the backend ──
interface NotificationData {
  type?: string;
  tripId?: string;
  routineTripId?: string;
  subscriptionId?: string;
  bookingId?: string;
  vehicleId?: string;
}

/**
 * Resolves the in-app route from a notification response and navigates to it.
 * The backend must include a `type` field in the notification `data` payload.
 *
 * This hook must be called inside a component that has access to the
 * expo-router navigation context (i.e. inside the Stack).
 */
export function useNotificationNavigation() {
  const router = useRouter();

  const navigate = useCallback(
    (response: NotificationResponse) => {
      const data = (response.notification.request.content.data ?? {}) as NotificationData;
      const { type, tripId, routineTripId, subscriptionId, vehicleId } = data;

      if (!type) return;

      switch (type) {
        // ── Bookings / Trips (one-off) ──
        case 'booking.new_request':
        case 'booking.accepted':
        case 'booking.cancelled_by_driver':
        case 'trip.started':
        case 'trip.completed':
          if (tripId) router.push(`/trip/${tripId}`);
          else router.push('/(tabs)/my-trips');
          break;

        case 'booking.rejected':
          router.push('/(tabs)/my-trips');
          break;

        case 'booking.passenger_cancelled':
          if (tripId) router.push(`/trip/${tripId}`);
          else router.push('/(tabs)/my-trips');
          break;

        case 'waitlist.promoted':
          if (tripId) router.push(`/trip/${tripId}`);
          else router.push('/(tabs)/my-trips');
          break;

        case 'trip.reminder':
          if (tripId) router.push(`/trip/${tripId}`);
          else router.push('/(tabs)/my-trips');
          break;

        // ── Chat ──
        case 'chat.new_message':
          if (tripId) router.push(`/chat/${tripId}`);
          else if (routineTripId) router.push(`/chat/routine/${routineTripId}`);
          else router.push('/(tabs)/messages');
          break;

        // ── Routine subscriptions ──
        case 'subscription.new_request':
          if (routineTripId) router.push(`/routine/${routineTripId}`);
          else router.push('/(tabs)/my-trips');
          break;

        case 'subscription.accepted':
        case 'subscription.rejected':
        case 'subscription.paused_by_driver':
        case 'subscription.resumed':
        case 'subscription.cancelled_by_driver':
        case 'subscription.occurrence_cancelled':
        case 'subscription.auto_paused':
        case 'subscription.passenger_paused':
        case 'subscription.passenger_cancelled':
        case 'waitlist.routine_promoted':
          if (subscriptionId) router.push(`/subscription/${subscriptionId}`);
          else router.push('/(tabs)/my-trips');
          break;

        case 'routine.reminder':
          if (routineTripId) router.push(`/routine/${routineTripId}`);
          else router.push('/(tabs)/my-trips');
          break;

        case 'routine.cancelled':
          router.push('/(tabs)/my-trips');
          break;

        // ── Verifications ──
        case 'verification.approved':
        case 'verification.rejected':
          router.push('/verification');
          break;

        case 'student_verification.approved':
        case 'student_verification.rejected':
          router.push('/student-verification');
          break;

        case 'vehicle.verification_approved':
        case 'vehicle.verification_rejected':
        case 'vehicle.document_expiring':
          if (vehicleId) router.push(`/vehicle/${vehicleId}`);
          else router.push('/vehicle');
          break;

        // ── System / Account ──
        case 'account.suspended':
        case 'account.reactivated':
          router.push('/(tabs)/profile');
          break;

        default:
          // Unknown type — do nothing, let the user find it manually
          break;
      }
    },
    [router],
  );

  return { navigate };
}
