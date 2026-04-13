import { useCallback, useReducer, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { chatApi } from '@/api/chat';
import { tripsApi } from '@/api/trips';
import { useAuthStore } from '@/stores/auth-store';
import { extractApiError } from '@/lib/utils';
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
      // Keep the existing array reference when nothing has changed so that
      // FlatList/FlashList skips a full re-render on every poll tick.
      if (
        state.messages.length === action.messages.length &&
        state.messages.at(-1)?.id === action.messages.at(-1)?.id
      ) {
        return state.loading || state.error
          ? { ...state, loading: false, error: null }
          : state;
      }
      return { ...state, messages: action.messages, loading: false, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'SEND_START':
      return { ...state, sending: true };
    case 'SEND_SUCCESS': {
      const updated = [...state.messages, action.message];
      return { ...state, sending: false, messages: updated };
    }
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
  // Mirrors the latest messages array so the polling closure can compare
  // without capturing a stale reference from the initial render.
  const messagesRef = useRef<ChatMessageResponse[]>(state.messages);

  const load = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const res = await chatApi.getMessages(tripId, otherUserId);
      const loaded = res.data.data ?? [];
      messagesRef.current = loaded;
      dispatch({ type: 'FETCH_SUCCESS', messages: loaded });
      chatApi.markAsRead(tripId, otherUserId).catch(() => { });
    } catch (e) {
      const status = (e as any)?.response?.status;
      // 403/404 = no booking yet — treat as empty conversation, not an error
      if (status === 403 || status === 404) {
        dispatch({ type: 'FETCH_SUCCESS', messages: [] });
      } else {
        dispatch({
          type: 'FETCH_ERROR',
          error: extractApiError(e, 'Error al cargar mensajes'),
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
          messagesRef.current = [...messagesRef.current, res.data.data];
          dispatch({ type: 'SEND_SUCCESS', message: res.data.data });
        }
      } catch (e) {
        dispatch({
          type: 'SEND_ERROR',
          error: extractApiError(e, 'Error al enviar mensaje'),
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
          const incoming = res.data.data;
          if (!incoming) return;
          // Skip dispatch (and FlatList re-render) when nothing has changed.
          const current = messagesRef.current;
          const hasNew =
            incoming.length !== current.length ||
            incoming.at(-1)?.id !== current.at(-1)?.id;
          if (hasNew) {
            messagesRef.current = incoming;
            dispatch({ type: 'FETCH_SUCCESS', messages: incoming });
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
    }, [load]),
  );

  return {
    ...state,
    currentUserId,
    load,
    sendMessage,
  };
}
