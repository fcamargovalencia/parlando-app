import { useCallback, useReducer, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { chatApi } from '@/api/chat';
import { tripsApi } from '@/api/trips';
import { chatWs } from '@/lib/chat-ws';
import { useAuthStore } from '@/stores/auth-store';
import { extractApiError } from '@/lib/utils';
import type { ChatMessageResponse, TripResponse, WsInboundFrame } from '@/types/api';

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
      // Mantener la referencia del array cuando no hay cambios para que
      // FlatList/FlashList omita el re-render completo en cada tick.
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
  // Espejo del array de mensajes para que los callbacks de WS lean siempre
  // la versión más reciente sin capturar referencias obsoletas.
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
      // 403/404 = sin reserva aún — tratar como conversación vacía
      if (status === 403 || status === 404) {
        dispatch({ type: 'FETCH_SUCCESS', messages: [] });
      } else {
        dispatch({
          type: 'FETCH_ERROR',
          error: extractApiError(e, 'Error al cargar mensajes'),
        });
      }
    }

    // Cargar datos del viaje de forma independiente
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
        // La info del viaje es opcional — no bloquear el chat
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

  // Carga inicial y suscripción WS al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'RESET' });
      load();

      const onWsMessage = (frame: WsInboundFrame) => {
        if (frame.type !== 'MESSAGE') return;
        // Solo procesar mensajes de esta conversación
        if (frame.tripId !== tripId) return;
        if (frame.senderId !== otherUserId && frame.senderId !== currentUserId) return;

        const incoming: ChatMessageResponse = {
          id: frame.id!,
          tripId: frame.tripId!,
          senderId: frame.senderId!,
          recipientId: frame.senderId === currentUserId ? otherUserId : currentUserId!,
          content: frame.content!,
          messageType: frame.messageType ?? 'TEXT',
          sentAt: frame.sentAt!,
          readAt: null,
        };

        // Evitar duplicados (el propio usuario ya ve su mensaje via SEND_SUCCESS)
        if (messagesRef.current.some((m) => m.id === incoming.id)) return;

        const updated = [...messagesRef.current, incoming];
        messagesRef.current = updated;
        dispatch({ type: 'FETCH_SUCCESS', messages: updated });
        chatApi.markAsRead(tripId, otherUserId).catch(() => { });
      };

      chatWs.on('message', onWsMessage);

      return () => {
        chatWs.off('message', onWsMessage);
      };
    }, [load, tripId, otherUserId, currentUserId]),
  );

  return {
    ...state,
    currentUserId,
    load,
    sendMessage,
  };
}
