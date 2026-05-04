import { api } from './client';
import type {
  ApiResponse,
  SendMessageRequest,
  ChatMessageResponse,
  ConversationResponse,
} from '@/types/api';

export const chatApi = {
  getConversations: () =>
    api.get<ApiResponse<ConversationResponse[]>>('/v1/chat/conversations'),

  getMessages: (tripId: string, otherUserId: string) =>
    api.get<ApiResponse<ChatMessageResponse[]>>(
      `/v1/chat/trips/${encodeURIComponent(tripId)}/users/${encodeURIComponent(otherUserId)}/messages`,
    ),

  sendMessage: (data: SendMessageRequest) =>
    api.post<ApiResponse<ChatMessageResponse>>('/v1/chat/messages', data),

  markAsRead: (tripId: string, otherUserId: string) =>
    api.patch<ApiResponse<number>>(
      `/v1/chat/trips/${encodeURIComponent(tripId)}/users/${encodeURIComponent(otherUserId)}/read`,
    ),

  getUnreadCount: () =>
    api.get<ApiResponse<number>>('/v1/chat/unread-count'),

  getRoutineTripMessages: (routineTripId: string, otherUserId: string) =>
    api.get<ApiResponse<ChatMessageResponse[]>>(
      `/v1/chat/routine-trips/${encodeURIComponent(routineTripId)}/users/${encodeURIComponent(otherUserId)}/messages`,
    ),

  markRoutineTripAsRead: (routineTripId: string, otherUserId: string) =>
    api.patch<ApiResponse<number>>(
      `/v1/chat/routine-trips/${encodeURIComponent(routineTripId)}/users/${encodeURIComponent(otherUserId)}/read`,
    ),

  getWsTicket: () =>
    api.post<ApiResponse<string>>('/v1/chat/ws-ticket'),
};
