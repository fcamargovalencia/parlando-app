import { useState } from 'react';
import { routineTripsApi } from '@/api/routine-trips';
import { useRoutineTripsStore } from '@/stores/routine-trips-store';
import type { CreateRoutineWaypointRequest, RoutineWaypointResponse } from '@/types/api';

interface UseRoutineWaypointsResult {
  waypoints: RoutineWaypointResponse[];
  isLoading: boolean;
  fetchWaypoints: (tripId: string) => Promise<void>;
  addWaypoint: (tripId: string, data: CreateRoutineWaypointRequest) => Promise<RoutineWaypointResponse>;
  deleteWaypoint: (tripId: string, waypointId: string) => Promise<void>;
  reorderWaypoints: (tripId: string, waypointIds: string[]) => Promise<void>;
}

export function useRoutineWaypoints(): UseRoutineWaypointsResult {
  const waypoints = useRoutineTripsStore((s) => s.waypoints);
  const fetchWaypointsFromStore = useRoutineTripsStore((s) => s.fetchWaypoints);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWaypoints = async (tripId: string) => {
    setIsLoading(true);
    try {
      await fetchWaypointsFromStore(tripId);
    } finally {
      setIsLoading(false);
    }
  };

  const addWaypoint = async (
    tripId: string,
    data: CreateRoutineWaypointRequest,
  ): Promise<RoutineWaypointResponse> => {
    const response = await routineTripsApi.addWaypoint(tripId, data);
    const newWaypoint = response.data.data!;
    await fetchWaypointsFromStore(tripId);
    return newWaypoint;
  };

  const deleteWaypoint = async (tripId: string, waypointId: string) => {
    await routineTripsApi.deleteWaypoint(tripId, waypointId);
    await fetchWaypointsFromStore(tripId);
  };

  const reorderWaypoints = async (tripId: string, waypointIds: string[]) => {
    await routineTripsApi.reorderWaypoints(tripId, { waypointIds });
    await fetchWaypointsFromStore(tripId);
  };

  return { waypoints, isLoading, fetchWaypoints, addWaypoint, deleteWaypoint, reorderWaypoints };
}
