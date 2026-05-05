import { api } from './client';
import type { ApiResponse, NotificationPreferences } from '@/types/api';

export const notificationsApi = {
  registerDevice: (token: string, platform: 'android' | 'ios') =>
    api.post<ApiResponse<null>>('/v1/devices', { token, platform }),

  unregisterDevice: (token: string) =>
    api.delete<ApiResponse<null>>(`/v1/devices/${encodeURIComponent(token)}`),

  getPreferences: () =>
    api.get<ApiResponse<NotificationPreferences>>('/v1/notifications/preferences'),

  updatePreferences: (preferences: Partial<NotificationPreferences>) =>
    api.patch<ApiResponse<NotificationPreferences>>('/v1/notifications/preferences', preferences),
};
