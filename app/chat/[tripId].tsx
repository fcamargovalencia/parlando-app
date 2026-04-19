import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import { Info } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner } from '@/components/ui';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatDisclaimers } from '@/components/chat/ChatDisclaimers';
import { ChatBookingBar } from '@/components/chat/ChatBookingBar';
import { BookTripModal } from '@/components/trip/BookTripModal';
import { useChat } from '@/hooks/useChat';
import { categoryForTrip } from '@/lib/my-trips';
import { Colors } from '@/constants/colors';
import type { TripStatus } from '@/types/api';

function normalizeTripStatus(value?: string | string[]): TripStatus | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const allowed: TripStatus[] = ['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  return allowed.includes(raw as TripStatus) ? (raw as TripStatus) : null;
}

export default function ChatScreen() {
  const { tripId, otherUserId, otherUserName, otherUserPhoto, tripStatus } =
    useLocalSearchParams<{
      tripId: string;
      otherUserId: string;
      otherUserName: string;
      otherUserPhoto?: string;
      tripStatus?: string;
    }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [bookVisible, setBookVisible] = useState(false);

  const {
    messages, trip, myBooking, counterpartBooking,
    loading, sending, bookingActionLoading, error,
    currentUserId, sendMessage, load, acceptBooking, rejectBooking, setMyBooking,
  } = useChat(tripId, otherUserId);

  // Track keyboard height on both platforms:
  //  - Android edge-to-edge: the window no longer auto-resizes, so we push the
  //    whole screen up manually using `paddingBottom` on the root View.
  //  - iOS: KeyboardAvoidingView handles the lift, but we still use the state to
  //    drop the safe-area inset from under the input (not needed while open).
  useEffect(() => {
    const isIOS = Platform.OS === 'ios';
    const showEvent = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    const show = Keyboard.addListener(showEvent, (e) => {
      let height = e.endCoordinates.height ?? 0;
      if (!isIOS) {
        // Android edge-to-edge: e.endCoordinates.height can be short by the
        // nav-bar height, so take the max with the footprint computed from the
        // screen bottom to the keyboard top.
        const screenHeight = Dimensions.get('screen').height;
        const keyboardTop = e.endCoordinates.screenY ?? screenHeight;
        height = Math.max(height, screenHeight - keyboardTop);
      }
      setKeyboardHeight(height);
      scrollTimer = setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, []);

  // Con FlatList invertido el mensaje más nuevo está en el índice 0 (abajo de la pantalla).
  // No se necesita scrollToEnd — los nuevos mensajes aparecen abajo de forma natural.
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const nameParts = (otherUserName ?? '').split(' ');
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';

  const initialTripStatus = useMemo(() => normalizeTripStatus(tripStatus), [tripStatus]);
  const effectiveTripStatus = trip?.status ?? initialTripStatus;
  const isDriver = trip?.driverId === currentUserId;
  const isHistoricalChat = effectiveTripStatus
    ? categoryForTrip(effectiveTripStatus) !== 'active'
    : false;
  const historicalNotice = useMemo(() => {
    if (!effectiveTripStatus) {
      return {
        title: 'Chat historico',
        message: 'Este viaje ya no admite nuevos mensajes ni acciones.',
      };
    }

    switch (effectiveTripStatus) {
      case 'CANCELLED':
        return {
          title: 'Viaje cancelado',
          message: 'El viaje fue cancelado. Este chat queda disponible solo como historial.',
        };
      case 'COMPLETED':
        return {
          title: 'Viaje finalizado',
          message: 'El viaje ya finalizo. Este chat queda disponible solo como historial.',
        };
      default:
        return {
          title: 'Chat historico',
          message: 'Este viaje ya no admite nuevos mensajes ni acciones.',
        };
    }
  }, [effectiveTripStatus]);

  // When the keyboard is open on either platform, the safe-area inset under the
  // input is redundant (Android: keyboard covers the nav bar; iOS: keyboard
  // already provides visual separation from the home indicator).
  const isAndroid = Platform.OS === 'android';
  const keyboardOpen = keyboardHeight > 0;
  const bottomPadding = keyboardOpen ? 0 : insets.bottom;

  return (
    <View
      className="flex-1 bg-neutral-50"
      style={isAndroid ? { paddingBottom: keyboardHeight } : undefined}
    >
      {/* Header */}
      <ChatHeader
        firstName={firstName}
        lastName={lastName}
        photoUrl={otherUserPhoto}
        trip={trip}
        onBack={() => router.back()}
      />

      {/* Booking bar — fijo entre header y mensajes */}
      {trip && !isHistoricalChat && (
        <ChatBookingBar
          isDriver={isDriver}
          trip={trip}
          myBooking={myBooking}
          counterpartBooking={counterpartBooking}
          actionLoading={bookingActionLoading}
          onReserve={() => setBookVisible(true)}
          onAccept={acceptBooking}
          onReject={rejectBooking}
        />
      )}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={isAndroid ? undefined : 'padding'}
      >
        {/* Messages */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Spinner />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6 gap-3">
            <Text className="text-sm text-neutral-500 text-center">{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <View className="flex-1">
            <ChatDisclaimers />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={reversedMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                isOwn={item.senderId === currentUserId}
              />
            )}
            inverted
            contentContainerStyle={{
              flexGrow: 1,
              padding: 16,
              justifyContent: messages.length === 0 ? 'center' : undefined,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        {/* Input o aviso histórico */}
        <View className="bg-white" style={{ paddingBottom: bottomPadding }}>
          {isHistoricalChat ? (
            <View className="px-4 pt-3 pb-2 border-t border-neutral-100">
              <View
                className="flex-row items-start gap-2 rounded-xl px-3 py-2.5"
                style={{
                  backgroundColor: Colors.semantic.infoLight,
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                }}
              >
                <Info size={16} color={Colors.semantic.info} style={{ marginTop: 1 }} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: Colors.semantic.info }}>
                    {historicalNotice.title}
                  </Text>
                  <Text className="text-xs text-neutral-600 mt-0.5">
                    {historicalNotice.message}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <ChatInput onSend={sendMessage} sending={sending} />
          )}
        </View>
      </KeyboardAvoidingView>

      {trip && !isHistoricalChat && (
        <BookTripModal
          trip={trip}
          visible={bookVisible}
          onClose={() => setBookVisible(false)}
          onBooked={(booking) => setMyBooking(booking)}
        />
      )}
    </View>
  );
}
