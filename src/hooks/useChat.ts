import { useCallback, useReducer, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { chatApi } from '@/api/chat';
import { bookingsApi } from '@/api/bookings';
import { tripsApi } from '@/api/trips';
import { chatWs } from '@/lib/chat-ws';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { extractApiError } from '@/lib/utils';
import type { BookingResponse, ChatMessageResponse, TripResponse, WsInboundFrame } from '@/types/api';

// ── State ──

interface ChatState {
  messages: ChatMessageResponse[];
  trip: TripResponse | null;
  /** Reserva propia (vista pasajero) */
  myBooking: BookingResponse | null;
  /** Reserva de la contraparte (vista conductor) */
  counterpartBooking: BookingResponse | null;
  loading: boolean;
  sending: boolean;
  bookingActionLoading: boolean;
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
  | { type: 'WS_MESSAGE'; message: ChatMessageResponse; }
  | { type: 'SET_TRIP'; trip: TripResponse; }
  | { type: 'SET_MY_BOOKING'; booking: BookingResponse | null; }
  | { type: 'SET_COUNTERPART_BOOKING'; booking: BookingResponse | null; }
  | { type: 'BOOKING_ACTION_START'; }
  | { type: 'BOOKING_ACTION_DONE'; booking: BookingResponse; };

function reducer(state: ChatState, action: ChatAction): ChatState {
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
    case 'SET_TRIP':
      return { ...state, trip: action.trip };
    case 'SET_MY_BOOKING':
      return { ...state, myBooking: action.booking };
    case 'SET_COUNTERPART_BOOKING':
      return { ...state, counterpartBooking: action.booking };
    case 'BOOKING_ACTION_START':
      return { ...state, bookingActionLoading: true };
    case 'BOOKING_ACTION_DONE':
      return { ...state, bookingActionLoading: false, counterpartBooking: action.booking };
    default:
      return state;
  }
}

const initial: ChatState = {
  messages: [],
  trip: null,
  myBooking: null,
  counterpartBooking: null,
  loading: true,
  sending: false,
  bookingActionLoading: false,
  error: null,
};

// ── Hook ──

export function useChat(tripId: string, otherUserId: string) {
  const [state, dispatch] = useReducer(reducer, initial);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const processedWsIds = useRef(new Set<string>());
  const setActiveChatTripId = useNotificationsStore((s) => s.setActiveChatTripId);

  const load = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });

    // Mensajes
    try {
      const res = await chatApi.getMessages(tripId, otherUserId);
      dispatch({ type: 'FETCH_SUCCESS', messages: res.data.data ?? [] });
      chatApi.markAsRead(tripId, otherUserId).catch(() => { });
    } catch (e) {
      const status = (e as any)?.response?.status;
      if (status === 403 || status === 404) {
        dispatch({ type: 'FETCH_SUCCESS', messages: [] });
      } else {
        dispatch({ type: 'FETCH_ERROR', error: extractApiError(e, 'Error al cargar mensajes') });
      }
    }

    // Viaje + reservas en paralelo (no bloquean la carga de mensajes)
    const [tripRes, myBookingRes, counterpartRes] = await Promise.allSettled([
      tripsApi.getDetails(tripId).catch(() => tripsApi.getById(tripId)),
      currentUserId
        ? bookingsApi.getByTripAndUser(tripId, currentUserId)
        : Promise.reject('no user'),
      bookingsApi.getByTripAndUser(tripId, otherUserId),
    ]);

    if (tripRes.status === 'fulfilled' && tripRes.value.data.data) {
      dispatch({ type: 'SET_TRIP', trip: tripRes.value.data.data });
    }

    dispatch({
      type: 'SET_MY_BOOKING',
      booking: myBookingRes.status === 'fulfilled'
        ? (myBookingRes.value.data.data ?? null)
        : null,
    });

    dispatch({
      type: 'SET_COUNTERPART_BOOKING',
      booking: counterpartRes.status === 'fulfilled'
        ? (counterpartRes.value.data.data ?? null)
        : null,
    });
  }, [tripId, otherUserId, currentUserId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    dispatch({ type: 'SEND_START' });
    try {
      const res = await chatApi.sendMessage({
        content: content.trim(),
        recipientId: otherUserId,
        tripId,
        messageType: 'TEXT',
      });
      if (res.data.data) dispatch({ type: 'SEND_SUCCESS', message: res.data.data });
    } catch (e) {
      dispatch({ type: 'SEND_ERROR', error: extractApiError(e, 'Error al enviar mensaje') });
    }
  }, [tripId, otherUserId]);

  const acceptBooking = useCallback(async (bookingId: string) => {
    dispatch({ type: 'BOOKING_ACTION_START' });
    try {
      const res = await bookingsApi.accept(bookingId);
      if (res.data.data) dispatch({ type: 'BOOKING_ACTION_DONE', booking: res.data.data });
    } catch {
      dispatch({ type: 'BOOKING_ACTION_DONE', booking: state.counterpartBooking! });
    }
  }, [state.counterpartBooking]);

  const rejectBooking = useCallback(async (bookingId: string) => {
    dispatch({ type: 'BOOKING_ACTION_START' });
    try {
      const res = await bookingsApi.reject(bookingId);
      if (res.data.data) dispatch({ type: 'BOOKING_ACTION_DONE', booking: res.data.data });
    } catch {
      dispatch({ type: 'BOOKING_ACTION_DONE', booking: state.counterpartBooking! });
    }
  }, [state.counterpartBooking]);

  const setMyBooking = useCallback((booking: BookingResponse) => {
    dispatch({ type: 'SET_MY_BOOKING', booking });
  }, []);

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'RESET' });
      processedWsIds.current.clear();
      load();

      // Signal to the global notification handler that this chat is active.
      // While active, foreground push alerts for this tripId are suppressed
      // because the user is already reading the conversation.
      setActiveChatTripId(tripId);

      const onWsMessage = (frame: WsInboundFrame) => {
        if (frame.type !== 'MESSAGE') return;
        if (String(frame.tripId) !== String(tripId)) return;
        if (frame.senderId !== undefined && frame.senderId !== otherUserId) return;
        if (frame.id && processedWsIds.current.has(frame.id)) return;
        if (frame.id) processedWsIds.current.add(frame.id);

        dispatch({
          type: 'WS_MESSAGE',
          message: {
            id: frame.id ?? `ws-${tripId}-${frame.sentAt ?? Date.now()}`,
            tripId: String(frame.tripId),
            senderId: frame.senderId ?? '',
            recipientId: currentUserId ?? '',
            content: frame.content ?? '',
            messageType: frame.messageType ?? 'TEXT',
            sentAt: frame.sentAt ?? new Date().toISOString(),
            readAt: null,
          },
        });
        chatApi.markAsRead(tripId, otherUserId).catch(() => { });
      };

      chatWs.on('message', onWsMessage);
      return () => {
        chatWs.off('message', onWsMessage);
        setActiveChatTripId(null);
      };
    }, [load, tripId, otherUserId, currentUserId, setActiveChatTripId]),
  );

  return {
    ...state,
    currentUserId,
    load,
    sendMessage,
    acceptBooking,
    rejectBooking,
    setMyBooking,
  };
}
