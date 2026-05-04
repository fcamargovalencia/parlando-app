import { useCallback, useReducer, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { chatApi } from '@/api/chat';
import { routineTripsApi } from '@/api/routine-trips';
import { chatWs } from '@/lib/chat-ws';
import { useAuthStore } from '@/stores/auth-store';
import { extractApiError } from '@/lib/utils';
import type {
  ChatMessageResponse,
  RoutineTripResponse,
  RoutineSubscriptionResponse,
  WsInboundFrame,
} from '@/types/api';

// ── State ──

interface RoutineChatState {
  messages: ChatMessageResponse[];
  routineTrip: RoutineTripResponse | null;
  /** Mi suscripción (vista pasajero) */
  mySubscription: RoutineSubscriptionResponse | null;
  /** Suscripción de la contraparte (vista conductor) */
  counterpartSubscription: RoutineSubscriptionResponse | null;
  loading: boolean;
  sending: boolean;
  error: string | null;
}

type RoutineChatAction =
  | { type: 'RESET'; }
  | { type: 'FETCH_START'; }
  | { type: 'FETCH_SUCCESS'; messages: ChatMessageResponse[]; }
  | { type: 'FETCH_ERROR'; error: string; }
  | { type: 'SEND_START'; }
  | { type: 'SEND_SUCCESS'; message: ChatMessageResponse; }
  | { type: 'SEND_ERROR'; error: string; }
  | { type: 'WS_MESSAGE'; message: ChatMessageResponse; }
  | { type: 'SET_ROUTINE_TRIP'; routineTrip: RoutineTripResponse; }
  | { type: 'SET_MY_SUBSCRIPTION'; subscription: RoutineSubscriptionResponse | null; }
  | { type: 'SET_COUNTERPART_SUBSCRIPTION'; subscription: RoutineSubscriptionResponse | null; };

function reducer(
  state: RoutineChatState,
  action: RoutineChatAction,
): RoutineChatState {
  switch (action.type) {
    case 'RESET':
      return initial;
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
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
    case 'SEND_SUCCESS':
      return { ...state, sending: false, messages: [...state.messages, action.message] };
    case 'SEND_ERROR':
      return { ...state, sending: false, error: action.error };
    case 'WS_MESSAGE':
      if (state.messages.some((m) => m.id === action.message.id)) return state;
      return { ...state, messages: [...state.messages, action.message] };
    case 'SET_ROUTINE_TRIP':
      return { ...state, routineTrip: action.routineTrip };
    case 'SET_MY_SUBSCRIPTION':
      return { ...state, mySubscription: action.subscription };
    case 'SET_COUNTERPART_SUBSCRIPTION':
      return { ...state, counterpartSubscription: action.subscription };
    default:
      return state;
  }
}

const initial: RoutineChatState = {
  messages: [],
  routineTrip: null,
  mySubscription: null,
  counterpartSubscription: null,
  loading: true,
  sending: false,
  error: null,
};

// ── Hook ──

export function useRoutineChat(routineTripId: string, otherUserId: string) {
  const [state, dispatch] = useReducer(reducer, initial);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const processedWsIds = useRef(new Set<string>());

  const load = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });

    // Mensajes
    try {
      const res = await chatApi.getRoutineTripMessages(routineTripId, otherUserId);
      dispatch({ type: 'FETCH_SUCCESS', messages: res.data.data ?? [] });
      chatApi.markRoutineTripAsRead(routineTripId, otherUserId).catch(() => { });
    } catch (e) {
      const status = (e as any)?.response?.status;
      if (status === 403 || status === 404) {
        dispatch({ type: 'FETCH_SUCCESS', messages: [] });
      } else {
        dispatch({ type: 'FETCH_ERROR', error: extractApiError(e, 'Error al cargar mensajes') });
      }
    }

    // Ruta rutinaria + suscripciones en paralelo
    const [tripRes, subscriptionsRes] = await Promise.allSettled([
      routineTripsApi.getById(routineTripId),
      routineTripsApi.getSubscriptions(routineTripId),
    ]);

    if (tripRes.status === 'fulfilled' && tripRes.value.data.data) {
      dispatch({ type: 'SET_ROUTINE_TRIP', routineTrip: tripRes.value.data.data });
    }

    if (subscriptionsRes.status === 'fulfilled' && subscriptionsRes.value.data.data) {
      const subs = subscriptionsRes.value.data.data;
      const mine = subs.find((s) => s.passengerId === currentUserId) ?? null;
      const counterpart = subs.find((s) => s.passengerId === otherUserId) ?? null;
      dispatch({ type: 'SET_MY_SUBSCRIPTION', subscription: mine });
      dispatch({ type: 'SET_COUNTERPART_SUBSCRIPTION', subscription: counterpart });
    }
  }, [routineTripId, otherUserId, currentUserId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      dispatch({ type: 'SEND_START' });
      try {
        const res = await chatApi.sendMessage({
          content: content.trim(),
          recipientId: otherUserId,
          routineTripId,
          messageType: 'TEXT',
        });
        if (res.data.data) dispatch({ type: 'SEND_SUCCESS', message: res.data.data });
      } catch (e) {
        dispatch({
          type: 'SEND_ERROR',
          error: extractApiError(e, 'Error al enviar mensaje'),
        });
      }
    },
    [routineTripId, otherUserId],
  );

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'RESET' });
      processedWsIds.current.clear();
      load();

      const onWsMessage = (frame: WsInboundFrame) => {
        if (frame.type !== 'MESSAGE') return;
        if (String(frame.routineTripId) !== String(routineTripId)) return;
        if (frame.senderId !== undefined && frame.senderId !== otherUserId) return;
        if (frame.id && processedWsIds.current.has(frame.id)) return;
        if (frame.id) processedWsIds.current.add(frame.id);

        dispatch({
          type: 'WS_MESSAGE',
          message: {
            id: frame.id ?? `ws-rt-${routineTripId}-${frame.sentAt ?? Date.now()}`,
            tripId: null,
            routineTripId,
            senderId: frame.senderId ?? '',
            recipientId: currentUserId ?? '',
            content: frame.content ?? '',
            messageType: frame.messageType ?? 'TEXT',
            sentAt: frame.sentAt ?? new Date().toISOString(),
            readAt: null,
          },
        });
        chatApi.markRoutineTripAsRead(routineTripId, otherUserId).catch(() => { });
      };

      chatWs.on('message', onWsMessage);
      return () => {
        chatWs.off('message', onWsMessage);
      };
    }, [load, routineTripId, otherUserId, currentUserId]),
  );

  return {
    ...state,
    currentUserId,
    load,
    sendMessage,
  };
}
