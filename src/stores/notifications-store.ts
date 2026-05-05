import { create } from 'zustand';

interface NotificationsState {
  fcmToken: string | null;
  permissionsGranted: boolean;
  unreadCount: number;

  setToken: (token: string | null) => void;
  setPermissions: (granted: boolean) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  fcmToken: null,
  permissionsGranted: false,
  unreadCount: 0,

  setToken: (fcmToken) => set({ fcmToken }),
  setPermissions: (permissionsGranted) => set({ permissionsGranted }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
}));
