import { create } from 'zustand';

interface WsState {
  connected: boolean;
  setConnected: (value: boolean) => void;
}

export const useWsStore = create<WsState>((set) => ({
  connected: false,
  setConnected: (value) => set({ connected: value }),
}));
