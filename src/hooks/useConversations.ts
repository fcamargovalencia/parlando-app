import { useCallback, useEffect, useReducer } from 'react';
import { useFocusEffect } from 'expo-router';
import { chatApi } from '@/api/chat';
import { chatWs } from '@/lib/chat-ws';
import { extractApiError } from '@/lib/utils';
import type { ConversationResponse } from '@/types/api';

// ── State ──

interface ConversationsState {
  conversations: ConversationResponse[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  unreadTotal: number;
}

type ConversationsAction =
  | { type: 'FETCH_START'; }
  | { type: 'FETCH_SUCCESS'; conversations: ConversationResponse[]; unread: number; }
  | { type: 'FETCH_ERROR'; error: string; }
  | { type: 'REFRESH_START'; };

function reducer(state: ConversationsState, action: ConversationsAction): ConversationsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'REFRESH_START':
      return { ...state, refreshing: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        conversations: action.conversations,
        unreadTotal: action.unread,
        loading: false,
        refreshing: false,
        error: null,
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, refreshing: false, error: action.error };
    default:
      return state;
  }
}

const initial: ConversationsState = {
  conversations: [],
  loading: true,
  refreshing: false,
  error: null,
  unreadTotal: 0,
};

// ── Hook ──

export function useConversations() {
  const [state, dispatch] = useReducer(reducer, initial);

  const load = useCallback(async (isRefresh = false) => {
    dispatch({ type: isRefresh ? 'REFRESH_START' : 'FETCH_START' });
    try {
      const [convRes, unreadRes] = await Promise.all([
        chatApi.getConversations(),
        chatApi.getUnreadCount(),
      ]);
      dispatch({
        type: 'FETCH_SUCCESS',
        conversations: convRes.data.data ?? [],
        unread: typeof unreadRes.data.data === 'number' ? unreadRes.data.data : 0,
      });
    } catch (e) {
      dispatch({
        type: 'FETCH_ERROR',
        error: extractApiError(e, 'Error al cargar conversaciones'),
      });
    }
  }, []);

  const refresh = useCallback(() => load(true), [load]);

  // Actualiza la lista sin ningún estado de carga visible — para actualizaciones WS.
  const silentRefresh = useCallback(async () => {
    try {
      const [convRes, unreadRes] = await Promise.all([
        chatApi.getConversations(),
        chatApi.getUnreadCount(),
      ]);
      dispatch({
        type: 'FETCH_SUCCESS',
        conversations: convRes.data.data ?? [],
        unread: typeof unreadRes.data.data === 'number' ? unreadRes.data.data : 0,
      });
    } catch {
      // Ignorar errores silenciosos — la lista existente sigue visible
    }
  }, []);

  // Al ganar foco (volver de un chat, cambiar de tab, etc.) refrescar silenciosamente
  // para reflejar mensajes leídos y nuevos sin mostrar ningún estado de carga.
  useFocusEffect(useCallback(() => {
    silentRefresh();
  }, [silentRefresh]));

  useEffect(() => {
    load();

    chatWs.on('message', silentRefresh);

    return () => {
      chatWs.off('message', silentRefresh);
    };
  }, [load, silentRefresh]);

  return {
    ...state,
    load,
    refresh,
  };
}
