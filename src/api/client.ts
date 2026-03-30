import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth-store';
import { Config } from '@/constants/config';

export const api = axios.create({
  baseURL: Config.API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ── Request: attach access token ──
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: handle 401 with silent refresh ──
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean; };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;
    const { refreshToken, setTokens, logout } = useAuthStore.getState();

    if (!refreshToken) {
      logout();
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post<{ data: { accessToken: string; refreshToken: string; }; }>(
            `${Config.API_URL}/v1/auth/refresh`,
            { refreshToken },
          )
          .then((res) => {
            const data = res.data.data;
            setTokens(data.accessToken, data.refreshToken);
            return data.accessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      logout();
      return Promise.reject(error);
    }
  },
);
