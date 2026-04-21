import { api } from './client';
import type {
  ApiResponse,
  CreateRoutineSubscriptionRequest,
  RoutineSubscriptionResponse,
  AcceptSubscriptionRequest,
  RejectSubscriptionRequest,
  PauseSubscriptionRequest,
  PickupOverrideRequest,
  BookingResponse,
  RoutineBookingResponse,
} from '@/types/api';

export const routineSubscriptionsApi = {
  create: (data: CreateRoutineSubscriptionRequest) =>
    api.post<ApiResponse<RoutineSubscriptionResponse>>('/v1/routine-subscriptions', data),

  getMine: () =>
    api.get<ApiResponse<RoutineSubscriptionResponse[]>>('/v1/routine-subscriptions/me'),

  getById: (id: string) =>
    api.get<ApiResponse<RoutineSubscriptionResponse>>(
      `/v1/routine-subscriptions/${encodeURIComponent(id)}`,
    ),

  getBookings: (id: string) =>
    api.get<ApiResponse<RoutineBookingResponse[]>>(
      `/v1/routine-subscriptions/${encodeURIComponent(id)}/bookings`,
    ),

  cancel: (id: string) =>
    api.delete<ApiResponse<null>>(`/v1/routine-subscriptions/${encodeURIComponent(id)}`),

  pause: (id: string, data: PauseSubscriptionRequest) =>
    api.patch<ApiResponse<RoutineSubscriptionResponse>>(
      `/v1/routine-subscriptions/${encodeURIComponent(id)}/pause`,
      data,
    ),

  resume: (id: string) =>
    api.patch<ApiResponse<RoutineSubscriptionResponse>>(
      `/v1/routine-subscriptions/${encodeURIComponent(id)}/resume`,
      {},
    ),

  accept: (id: string, data?: AcceptSubscriptionRequest) =>
    api.patch<ApiResponse<RoutineSubscriptionResponse>>(
      `/v1/routine-subscriptions/${encodeURIComponent(id)}/accept`,
      data ?? {},
    ),

  reject: (id: string, data?: RejectSubscriptionRequest) =>
    api.patch<ApiResponse<RoutineSubscriptionResponse>>(
      `/v1/routine-subscriptions/${encodeURIComponent(id)}/reject`,
      data ?? {},
    ),

  overridePickup: (bookingId: string, data: PickupOverrideRequest) =>
    api.put<ApiResponse<BookingResponse>>(
      `/v1/bookings/${encodeURIComponent(bookingId)}/pickup-override`,
      data,
    ),
};
