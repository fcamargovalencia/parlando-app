import { api } from './client';
import type { ApiResponse, CreateTripRequest, TripResponse } from '@/types/api';

export const tripsApi = {
  create: (data: CreateTripRequest) =>
    api.post<ApiResponse<TripResponse>>('/v1/trips', data),

  publish: (id: string) =>
    api.patch<ApiResponse<TripResponse>>(`/v1/trips/${encodeURIComponent(id)}/publish`),

  getMine: () =>
    api.get<ApiResponse<TripResponse[]>>('/v1/trips/me'),

  getById: (id: string) =>
    api.get<ApiResponse<TripResponse>>(`/v1/trips/${encodeURIComponent(id)}`),
};
