import { useCallback, useReducer, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { chatApi } from '@/api/chat';
import { tripsApi } from '@/api/trips';
import { useAuthStore } from '@/stores/auth-store';
import type { ChatMessageResponse, TripResponse } from '@/types/api';

// ── State ──

interface ChatState {
  messages: ChatMessageResponse[];
  trip: TripResponse | null;
  loading: boolean;
  sending: boolean;
  error: string | null;
}

type ChatAction =
  | { type: 'RESET'; }
  | { type: 'FETCH_START'; }
  | { type: 'FETCH_SUCCESS'; messages: ChatMessageResponse[]; }
  | { type: 'FETCH_ERROR'; error: string; }
  | { type: 'SEND_START'; }
  | { type: 'SEND_SUCCESS'; message: ChatMessageResponse; }
  | { type: 'SEND_ERROR'; error: string; }
  | { type: 'SET_TRIP'; trip: TripResponse; };

function reducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'RESET':
      return initial;
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, messages: action.messages, loading: false, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'SEND_START':
      return { ...state, sending: true };
    case 'SEND_SUCCESS':
      return {
        ...state,
        sending: false,
        messages: [...state.messages, action.message],
      };
    case 'SEND_ERROR':
      return { ...state, sending: false, error: action.error };
    case 'SET_TRIP':
      return { ...state, trip: action.trip };
    default:
      return state;
  }
}

const initial: ChatState = {
  messages: [],
  trip: null,
  loading: true,
  sending: false,
  error: null,
};

// ── Hook ──

export function useChat(tripId: string, otherUserId: string) {
  const [state, dispatch] = useReducer(reducer, initial);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const res = await chatApi.getMessages(tripId, otherUserId);
      dispatch({ type: 'FETCH_SUCCESS', messages: res.data.data ?? [] });
      chatApi.markAsRead(tripId, otherUserId).catch(() => { });
    } catch (e: any) {
      const status = e?.response?.status;
      // 403/404 = no booking yet — treat as empty conversation, not an error
      if (status === 403 || status === 404) {
        dispatch({ type: 'FETCH_SUCCESS', messages: [] });
      } else {
        dispatch({
          type: 'FETCH_ERROR',
          error: e?.response?.data?.message ?? 'Error al cargar mensajes',
        });
      }
    }

    // Load trip data independently — try /details first, fallback to /getById
    try {
      const tripRes = await tripsApi.getDetails(tripId);
      if (tripRes.data.data) {
        dispatch({ type: 'SET_TRIP', trip: tripRes.data.data });
      }
    } catch {
      try {
        const tripRes = await tripsApi.getById(tripId);
        if (tripRes.data.data) {
          dispatch({ type: 'SET_TRIP', trip: tripRes.data.data });
        }
      } catch {
        // Trip info is optional — don't block the chat
      }
    }
  }, [tripId, otherUserId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      dispatch({ type: 'SEND_START' });
      try {
        const res = await chatApi.sendMessage({
          content: content.trim(),
          recipientId: otherUserId,
          tripId,
          messageType: 'TEXT',
        });
        if (res.data.data) {
          dispatch({ type: 'SEND_SUCCESS', message: res.data.data });
        }
      } catch (e: any) {
        dispatch({
          type: 'SEND_ERROR',
          error: e?.response?.data?.message ?? 'Error al enviar mensaje',
        });
      }
    },
    [tripId, otherUserId],
  );

  // Reload on screen focus & start polling
  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'RESET' });
      load();

      pollRef.current = setInterval(async () => {
        try {
          const res = await chatApi.getMessages(tripId, otherUserId);
          if (res.data.data) {
            dispatch({ type: 'FETCH_SUCCESS', messages: res.data.data });
            chatApi.markAsRead(tripId, otherUserId).catch(() => { });
          }
        } catch {
          // Silent fail on poll
        }
      }, 5000);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      };
    }, [load, tripId, otherUserId]),
  );

  return {
    ...state,
    currentUserId,
    load,
    sendMessage,
  };
}
