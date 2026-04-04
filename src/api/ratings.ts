import { api } from './client';
import type { ApiResponse, CreateRatingRequest, RatingResponse } from '@/types/api';

export const ratingsApi = {
  create: (data: CreateRatingRequest) =>
    api.post<ApiResponse<RatingResponse>>('/v1/ratings', data),

  getByUser: (userId: string) =>
    api.get<ApiResponse<RatingResponse[]>>(`/v1/ratings/user/${encodeURIComponent(userId)}`),

  getByTrip: (tripId: string) =>
    api.get<ApiResponse<RatingResponse[]>>(`/v1/ratings/trip/${encodeURIComponent(tripId)}`),
};
