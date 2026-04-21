import { useCallback } from 'react';
import { routineSubscriptionsApi } from '@/api/routine-subscriptions';
import { useRoutineSubscriptionsStore } from '@/stores/routine-subscriptions-store';
import type { RoutineSubscriptionResponse } from '@/types/api';

interface UseSubscriptionRequestsResult {
  subscriptions: RoutineSubscriptionResponse[];
  pendingCount: number;
  isLoading: boolean;
  refetch: (routineTripId: string) => void;
  accept: (id: string, routineTripId: string, notes?: string) => Promise<void>;
  reject: (id: string, routineTripId: string, reason?: string) => Promise<void>;
}

export function useSubscriptionRequests(routineTripId: string): UseSubscriptionRequestsResult {
  const subscriptionsByTrip = useRoutineSubscriptionsStore((s) => s.subscriptionsByTrip);
  const isLoading = useRoutineSubscriptionsStore((s) => s.isLoading);
  const fetchForTrip = useRoutineSubscriptionsStore((s) => s.fetchForTrip);
  const updateInTrip = useRoutineSubscriptionsStore((s) => s.updateInTrip);

  const subscriptions = subscriptionsByTrip[routineTripId] ?? [];
  const pendingCount = subscriptions.filter((s) => s.status === 'PENDING').length;

  const refetch = useCallback(
    (tripId: string) => {
      fetchForTrip(tripId);
    },
    [fetchForTrip],
  );

  const accept = useCallback(
    async (id: string, tripId: string, notes?: string) => {
      const response = await routineSubscriptionsApi.accept(id, notes ? { notes } : undefined);
      const updated = response.data.data;
      if (updated) updateInTrip(tripId, updated);
    },
    [updateInTrip],
  );

  const reject = useCallback(
    async (id: string, tripId: string, reason?: string) => {
      const response = await routineSubscriptionsApi.reject(id, reason ? { reason } : undefined);
      const updated = response.data.data;
      if (updated) updateInTrip(tripId, updated);
    },
    [updateInTrip],
  );

  return {
    subscriptions,
    pendingCount,
    isLoading,
    refetch,
    accept,
    reject,
  };
}
