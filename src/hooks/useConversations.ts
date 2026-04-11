import { useCallback, useEffect, useReducer } from 'react';
import { chatApi } from '@/api/chat';
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
  | { type: 'REFRESH_START'; }
  | { type: 'SET_UNREAD'; count: number; };

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
    case 'SET_UNREAD':
      return { ...state, unreadTotal: action.count };
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

  useEffect(() => {
    load();
  }, [load]);

  return {
    ...state,
    load,
    refresh,
  };
}
