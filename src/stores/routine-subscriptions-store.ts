import { create } from 'zustand';
import { routineSubscriptionsApi } from '@/api/routine-subscriptions';
import { routineTripsApi } from '@/api/routine-trips';
import { usersApi } from '@/api/users';
import type { RoutineSubscriptionResponse, RoutineTripResponse, SubscriptionStatus, UserResponse } from '@/types/api';

interface RoutineSubscriptionsState {
  // As passenger
  mySubscriptions: RoutineSubscriptionResponse[];
  // As driver (keyed by routineTripId)
  subscriptionsByTrip: Record<string, RoutineSubscriptionResponse[]>;
  isLoading: boolean;
  error: string | null;

  fetchMine: () => Promise<void>;
  fetchForTrip: (routineTripId: string) => Promise<void>;
  updateInMine: (subscription: RoutineSubscriptionResponse) => void;
  removeFromMine: (id: string) => void;
  updateInTrip: (routineTripId: string, subscription: RoutineSubscriptionResponse) => void;
  clearTripSubscriptions: (routineTripId: string) => void;

  // Derived selectors
  pendingForTrip: (routineTripId: string) => RoutineSubscriptionResponse[];
  activeForTrip: (routineTripId: string) => RoutineSubscriptionResponse[];
  pendingCount: () => number;
}

export const useRoutineSubscriptionsStore = create<RoutineSubscriptionsState>((set, get) => ({
  mySubscriptions: [],
  subscriptionsByTrip: {},
  isLoading: false,
  error: null,

  fetchMine: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await routineSubscriptionsApi.getMine();
      const subscriptions = response.data.data ?? [];

      // Enrich subscriptions with routineTrip data (API doesn't include it in /me)
      const uniqueTripIds = [...new Set(subscriptions.map((s) => s.routineTripId))];
      const tripMap: Record<string, RoutineTripResponse> = {};
      await Promise.allSettled(
        uniqueTripIds.map(async (tripId) => {
          try {
            const tripResponse = await routineTripsApi.getById(tripId);
            if (tripResponse.data.data) {
              tripMap[tripId] = tripResponse.data.data;
            }
          } catch {
            // ignore individual trip fetch errors
          }
        }),
      );

      const enriched = subscriptions.map((s) => ({
        ...s,
        routineTrip: tripMap[s.routineTripId] ?? s.routineTrip,
      }));

      set({ mySubscriptions: enriched });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar las suscripciones';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchForTrip: async (routineTripId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await routineTripsApi.getSubscriptions(routineTripId);
      const subscriptions: RoutineSubscriptionResponse[] = response.data.data ?? [];

      // Enrich with passenger data
      const uniquePassengerIds = [...new Set(subscriptions.map((s) => s.passengerId))];
      const passengerMap: Record<string, UserResponse> = {};
      await Promise.allSettled(
        uniquePassengerIds.map(async (userId) => {
          try {
            const userRes = await usersApi.getById(userId);
            if (userRes.data.data) passengerMap[userId] = userRes.data.data;
          } catch {
            // ignore individual fetch errors
          }
        }),
      );

      const enriched = subscriptions.map((s) => {
        const u = passengerMap[s.passengerId];
        return u
          ? {
            ...s,
            passenger: {
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
              profilePhotoUrl: u.profilePhotoUrl ?? null,
              trustScore: u.trustScore,
              verified: u.verificationLevel !== 'NONE',
            },
          }
          : s;
      });

      set((state) => ({
        subscriptionsByTrip: {
          ...state.subscriptionsByTrip,
          [routineTripId]: enriched,
        },
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar las suscripciones';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateInMine: (subscription) =>
    set((state) => ({
      mySubscriptions: state.mySubscriptions.some((s) => s.id === subscription.id)
        ? state.mySubscriptions.map((s) => (s.id === subscription.id ? subscription : s))
        : [...state.mySubscriptions, subscription],
    })),

  removeFromMine: (id) =>
    set((state) => ({
      mySubscriptions: state.mySubscriptions.filter((s) => s.id !== id),
    })),

  updateInTrip: (routineTripId, subscription) =>
    set((state) => {
      const current = state.subscriptionsByTrip[routineTripId] ?? [];
      const updated = current.some((s) => s.id === subscription.id)
        ? current.map((s) =>
          s.id === subscription.id
            ? { ...subscription, passenger: subscription.passenger ?? s.passenger }
            : s,
        )
        : [...current, subscription];
      return {
        subscriptionsByTrip: { ...state.subscriptionsByTrip, [routineTripId]: updated },
      };
    }),

  clearTripSubscriptions: (routineTripId) =>
    set((state) => {
      const next = { ...state.subscriptionsByTrip };
      delete next[routineTripId];
      return { subscriptionsByTrip: next };
    }),

  pendingForTrip: (routineTripId) => {
    const subs = get().subscriptionsByTrip[routineTripId] ?? [];
    return subs.filter((s) => s.status === 'PENDING');
  },

  activeForTrip: (routineTripId) => {
    const active: SubscriptionStatus[] = ['ACCEPTED', 'PAUSED'];
    const subs = get().subscriptionsByTrip[routineTripId] ?? [];
    return subs.filter((s) => active.includes(s.status));
  },

  pendingCount: () =>
    Object.values(get().subscriptionsByTrip)
      .flat()
      .filter((s) => s.status === 'PENDING').length,
}));
