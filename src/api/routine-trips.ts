import { api } from './client';
import type {
  ApiResponse,
  CreateRoutineTripRequest,
  UpdateRoutineTripRequest,
  RoutineTripResponse,
  SearchRoutineTripsParams,
  RoutineTripSearchResult,
  CreateRoutineWaypointRequest,
  ReorderRoutineWaypointsRequest,
  RoutineWaypointResponse,
  RoutineSubscriptionResponse,
} from '@/types/api';

export const routineTripsApi = {
  create: (data: CreateRoutineTripRequest) =>
    api.post<ApiResponse<RoutineTripResponse>>('/v1/routine-trips', data),

  getMine: () =>
    api.get<ApiResponse<RoutineTripResponse[]>>('/v1/routine-trips/me'),

  search: (params: SearchRoutineTripsParams) =>
    api.get<ApiResponse<RoutineTripSearchResult[]>>('/v1/routine-trips/search', {
      params: { ...params, days: params.days.join(',') },
    }),

  getById: (id: string) =>
    api.get<ApiResponse<RoutineTripResponse>>(`/v1/routine-trips/${encodeURIComponent(id)}`),

  update: (id: string, data: UpdateRoutineTripRequest) =>
    api.put<ApiResponse<RoutineTripResponse>>(`/v1/routine-trips/${encodeURIComponent(id)}`, data),

  cancel: (id: string) =>
    api.delete<ApiResponse<null>>(`/v1/routine-trips/${encodeURIComponent(id)}`),

  publish: (id: string) =>
    api.patch<ApiResponse<RoutineTripResponse>>(`/v1/routine-trips/${encodeURIComponent(id)}/publish`),

  pause: (id: string) =>
    api.patch<ApiResponse<RoutineTripResponse>>(`/v1/routine-trips/${encodeURIComponent(id)}/pause`, {}),

  resume: (id: string) =>
    api.patch<ApiResponse<RoutineTripResponse>>(`/v1/routine-trips/${encodeURIComponent(id)}/resume`, {}),

  getSubscriptions: (routineTripId: string) =>
    api.get<ApiResponse<RoutineSubscriptionResponse[]>>(
      `/v1/routine-trips/${encodeURIComponent(routineTripId)}/subscriptions`,
    ),

  getWaypoints: (id: string) =>
    api.get<ApiResponse<RoutineWaypointResponse[]>>(
      `/v1/routine-trips/${encodeURIComponent(id)}/waypoints`,
    ),

  addWaypoint: (id: string, data: CreateRoutineWaypointRequest) =>
    api.post<ApiResponse<RoutineWaypointResponse>>(
      `/v1/routine-trips/${encodeURIComponent(id)}/waypoints`,
      data,
    ),

  deleteWaypoint: (id: string, waypointId: string) =>
    api.delete<ApiResponse<null>>(
      `/v1/routine-trips/${encodeURIComponent(id)}/waypoints/${encodeURIComponent(waypointId)}`,
    ),

  reorderWaypoints: (id: string, data: ReorderRoutineWaypointsRequest) => {
    return api.patch<ApiResponse<RoutineWaypointResponse[]>>(
      `/v1/routine-trips/${encodeURIComponent(id)}/waypoints/reorder`,
      data,
    );
  },
};
