import { api } from './client';
import type { ApiResponse, BookingResponse, CreateBookingRequest } from '@/types/api';

export const bookingsApi = {
  create: (data: CreateBookingRequest) =>
    api.post<ApiResponse<BookingResponse>>('/v1/bookings', data),

  getMine: () =>
    api.get<ApiResponse<BookingResponse[]>>('/v1/bookings/me'),

  getById: (id: string) =>
    api.get<ApiResponse<BookingResponse>>(`/v1/bookings/${encodeURIComponent(id)}`),

  getByTrip: (tripId: string) =>
    api.get<ApiResponse<BookingResponse[]>>(`/v1/bookings/trip/${encodeURIComponent(tripId)}`),

  cancel: (id: string) =>
    api.delete<ApiResponse<null>>(`/v1/bookings/${encodeURIComponent(id)}`),

  accept: (id: string) =>
    api.patch<ApiResponse<BookingResponse>>(`/v1/bookings/${encodeURIComponent(id)}/accept`),

  reject: (id: string) =>
    api.patch<ApiResponse<BookingResponse>>(`/v1/bookings/${encodeURIComponent(id)}/reject`),

  board: (id: string) =>
    api.patch<ApiResponse<BookingResponse>>(`/v1/bookings/${encodeURIComponent(id)}/board`),

  noShow: (id: string) =>
    api.patch<ApiResponse<BookingResponse>>(`/v1/bookings/${encodeURIComponent(id)}/no-show`),
};
