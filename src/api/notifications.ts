import { api } from './client';
import { useAuthStore } from '@/stores/auth-store';
import { Config } from '@/constants/config';
import type { ApiResponse, NotificationPreferences } from '@/types/api';

export const notificationsApi = {
  /**
   * Registers a device push token with the backend.
   * Uses native fetch instead of axios to avoid a Hermes/axios body-serialization
   * issue that strips the request body before it reaches the network layer.
   */
  registerDevice: async (token: string, platform: 'android' | 'ios'): Promise<void> => {
    const accessToken = useAuthStore.getState().accessToken;
    const res = await fetch(`${Config.API_URL}/v1/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ token, platform: platform.toUpperCase() }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`registerDevice failed ${res.status}: ${text}`);
    }
  },

  unregisterDevice: (token: string) =>
    api.delete<ApiResponse<null>>(`/v1/devices/${encodeURIComponent(token)}`),

  getPreferences: () =>
    api.get<ApiResponse<NotificationPreferences>>('/v1/notifications/preferences'),

  /**
   * Uses native fetch instead of axios to avoid the same Hermes body-serialization
   * issue that affects registerDevice (axios strips the body before it hits the network).
   * The backend expects PATCH on this endpoint.
   */
  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<void> => {
    const accessToken = useAuthStore.getState().accessToken;
    const res = await fetch(`${Config.API_URL}/v1/notifications/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(preferences),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`updatePreferences failed ${res.status}: ${text}`);
    }
  },
};
