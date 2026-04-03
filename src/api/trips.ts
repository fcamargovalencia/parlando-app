import { api } from './client';
import type { ApiResponse, PageResponse, CreateTripRequest, UpdateTripRequest, TripResponse, SearchTripsParams, RouteWaypointResponse } from '@/types/api';

export const tripsApi = {
  create: (data: CreateTripRequest) =>
    api.post<ApiResponse<TripResponse>>('/v1/trips', data),

  publish: (id: string) =>
    api.patch<ApiResponse<TripResponse>>(`/v1/trips/${encodeURIComponent(id)}/publish`),

  getMine: () =>
    api.get<ApiResponse<TripResponse[]>>('/v1/trips/me'),

  getById: (id: string) =>
    api.get<ApiResponse<TripResponse>>(`/v1/trips/${encodeURIComponent(id)}`),

  update: (id: string, data: UpdateTripRequest) =>
    api.put<ApiResponse<TripResponse>>(`/v1/trips/${encodeURIComponent(id)}`, data),

  getDetails: (id: string) =>
    api.get<ApiResponse<TripResponse>>(`/v1/trips/${encodeURIComponent(id)}/details`),

  getWaypoints: (id: string) =>
    api.get<ApiResponse<RouteWaypointResponse[]>>(`/v1/trips/${encodeURIComponent(id)}/waypoints`),

  start: (id: string) =>
    api.patch<ApiResponse<TripResponse>>(`/v1/trips/${encodeURIComponent(id)}/start`),

  complete: (id: string) =>
    api.patch<ApiResponse<TripResponse>>(`/v1/trips/${encodeURIComponent(id)}/complete`),

  cancel: (id: string) =>
    api.delete<ApiResponse<null>>(`/v1/trips/${encodeURIComponent(id)}`),

  search: (params: SearchTripsParams) =>
    api.get<ApiResponse<PageResponse<TripResponse>>>('/v1/trips/search', { params }),
};
