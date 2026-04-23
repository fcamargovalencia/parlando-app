import { useCallback, useMemo } from 'react';
import { routineSubscriptionsApi } from '@/api/routine-subscriptions';
import { useRoutineSubscriptionsStore } from '@/stores/routine-subscriptions-store';
import { extractApiError } from '@/lib/utils';
import type {
  RoutineSubscriptionResponse,
  PauseSubscriptionRequest,
  PickupOverrideRequest,
} from '@/types/api';

export interface UseMySubscriptionsHook {
  subscriptions: RoutineSubscriptionResponse[];
  activeCount: number;
  pendingCount: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
  pauseSubscription: (id: string, from: string, to?: string, reason?: string) => Promise<void>;
  resumeSubscription: (id: string) => Promise<void>;
  cancelSubscription: (id: string) => Promise<void>;
  overridePickup: (bookingId: string, req: PickupOverrideRequest) => Promise<void>;
}

export function useMySubscriptions(): UseMySubscriptionsHook {
  const mySubscriptions = useRoutineSubscriptionsStore((s) => s.mySubscriptions);
  const isLoading = useRoutineSubscriptionsStore((s) => s.isLoading);
  const fetchMine = useRoutineSubscriptionsStore((s) => s.fetchMine);
  const updateInMine = useRoutineSubscriptionsStore((s) => s.updateInMine);
  const removeFromMine = useRoutineSubscriptionsStore((s) => s.removeFromMine);

  const activeCount = useMemo(
    () => mySubscriptions.filter((s) => s.status === 'ACCEPTED').length,
    [mySubscriptions],
  );
  const pendingCount = useMemo(
    () => mySubscriptions.filter((s) => s.status === 'PENDING').length,
    [mySubscriptions],
  );

  const refetch = useCallback(async () => {
    await fetchMine();
  }, [fetchMine]);

  const pauseSubscription = useCallback(
    async (id: string, from: string, to?: string, reason?: string) => {
      const payload: PauseSubscriptionRequest = { fromDate: from };
      if (to) payload.toDate = to;
      if (reason) payload.reason = reason;
      const response = await routineSubscriptionsApi.pause(id, payload);
      const updated = response.data.data;
      if (updated) updateInMine(updated);
    },
    [updateInMine],
  );

  const resumeSubscription = useCallback(
    async (id: string) => {
      const response = await routineSubscriptionsApi.resume(id);
      const updated = response.data.data;
      if (updated) updateInMine(updated);
    },
    [updateInMine],
  );

  const cancelSubscription = useCallback(
    async (id: string) => {
      await routineSubscriptionsApi.cancel(id);
      removeFromMine(id);
    },
    [removeFromMine],
  );

  const overridePickup = useCallback(
    async (bookingId: string, req: PickupOverrideRequest) => {
      await routineSubscriptionsApi.overridePickup(bookingId, req);
    },
    [],
  );

  return {
    subscriptions: mySubscriptions,
    activeCount,
    pendingCount,
    isLoading,
    refetch,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    overridePickup,
  };
}
