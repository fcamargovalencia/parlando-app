import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRoutineTripsStore } from '@/stores/routine-trips-store';
import type { RecurrenceDay, RoutineTripResponse } from '@/types/api';

const TODAY_DAY_MAP: Record<number, RecurrenceDay> = {
  0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
};

function getTodayRoutineTrips(trips: RoutineTripResponse[]): RoutineTripResponse[] {
  const todayDay = TODAY_DAY_MAP[new Date().getDay()];
  return trips.filter(
    (t) => t.status === 'ACTIVE' && t.recurrenceDays.includes(todayDay),
  );
}

export function useHomeScreen() {
  const user = useAuthStore((s) => s.user);
  const isDriver = user?.role === 'DRIVER';
  const [refreshing, setRefreshing] = useState(false);

  const myRoutineTrips = useRoutineTripsStore((s) => s.myRoutineTrips);
  const fetchMineRoutine = useRoutineTripsStore((s) => s.fetchMine);

  const todayTrips = useMemo(() => getTodayRoutineTrips(myRoutineTrips), [myRoutineTrips]);

  useEffect(() => {
    if (isDriver) fetchMineRoutine();
  }, [isDriver]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const showVerificationBanner =
    user && (user.verificationLevel === 'NONE' || user.verificationLevel === 'BASIC');

  return {
    user,
    isDriver,
    refreshing,
    onRefresh,
    todayTrips,
    showVerificationBanner,
  };
}
