import { create } from 'zustand';

interface NotificationsState {
  fcmToken: string | null;
  permissionsGranted: boolean;
  unreadCount: number;
  /**
   * The tripId of the chat screen currently visible in the foreground.
   * Set by useChat when the screen gains focus; cleared on blur.
   * Used by setNotificationHandler to suppress foreground alerts for the
   * active conversation (the user is already reading it).
   */
  activeChatTripId: string | null;

  setToken: (token: string | null) => void;
  setPermissions: (granted: boolean) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
  setActiveChatTripId: (tripId: string | null) => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  fcmToken: null,
  permissionsGranted: false,
  unreadCount: 0,
  activeChatTripId: null,

  setToken: (fcmToken) => set({ fcmToken }),
  setPermissions: (permissionsGranted) => set({ permissionsGranted }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
  setActiveChatTripId: (activeChatTripId) => set({ activeChatTripId }),
}));
