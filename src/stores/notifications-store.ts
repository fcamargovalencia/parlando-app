import { create } from 'zustand';
import type { NotificationPreferences } from '@/types/api';

export interface StoredNotification {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  /** Raw data payload from the notification */
  data: Record<string, unknown>;
  receivedAt: number; // Unix ms timestamp
  read: boolean;
}

const MAX_HISTORY = 50;

interface NotificationsState {
  fcmToken: string | null;
  permissionsGranted: boolean;
  /** Derived from history: number of unread stored notifications */
  unreadCount: number;
  history: StoredNotification[];
  /**
   * The tripId of the chat screen currently visible in the foreground.
   * Set by useChat when the screen gains focus; cleared on blur.
   * Used by setNotificationHandler to suppress foreground alerts for the
   * active conversation (the user is already reading it).
   */
  activeChatTripId: string | null;
  /**
   * User notification preferences loaded from the backend.
   * Null until the first successful fetch.
   */
  preferences: NotificationPreferences | null;

  setToken: (token: string | null) => void;
  setPermissions: (granted: boolean) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
  addNotification: (n: Omit<StoredNotification, 'read'>) => void;
  removeNotification: (id: string) => void;
  markAllAsRead: () => void;
  clearHistory: () => void;
  setActiveChatTripId: (tripId: string | null) => void;
  setPreferences: (prefs: NotificationPreferences) => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  fcmToken: null,
  permissionsGranted: false,
  unreadCount: 0,
  history: [],
  activeChatTripId: null,
  preferences: null,

  setToken: (fcmToken) => set({ fcmToken }),
  setPermissions: (permissionsGranted) => set({ permissionsGranted }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
  addNotification: (n) =>
    set((state) => {
      const next = [{ ...n, read: false }, ...state.history].slice(0, MAX_HISTORY);
      return { history: next, unreadCount: state.unreadCount + 1 };
    }),
  removeNotification: (id) =>
    set((state) => {
      const next = state.history.filter((n) => n.id !== id);
      const unreadCount = next.filter((n) => !n.read).length;
      return { history: next, unreadCount };
    }),
  markAllAsRead: () =>
    set((state) => ({
      history: state.history.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  clearHistory: () => set({ history: [], unreadCount: 0 }),
  setActiveChatTripId: (activeChatTripId) => set({ activeChatTripId }),
  setPreferences: (preferences) => set({ preferences }),
}));
