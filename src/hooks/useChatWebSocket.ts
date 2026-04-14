import { useEffect } from 'react';
import { AppState } from 'react-native';
import { chatWs } from '@/lib/chat-ws';
import { useAuthStore } from '@/stores/auth-store';
import { useWsStore } from '@/stores/ws-store';

/**
 * Gestiona el ciclo de vida del WebSocket de chat.
 * Debe montarse UNA SOLA VEZ en el layout raíz para que la conexión
 * persista durante toda la sesión, independientemente de la pantalla activa.
 */
export function useChatWebSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const setConnected = useWsStore((s) => s.setConnected);

  useEffect(() => {
    if (!accessToken || !userId) {
      chatWs.disconnect();
      setConnected(false);
      return;
    }

    const onConnected = () => setConnected(true);
    const onDisconnected = () => setConnected(false);

    chatWs.on('connected', onConnected);
    chatWs.on('disconnected', onDisconnected);
    chatWs.connect(accessToken, userId);

    // Reconectar cuando la app vuelve al primer plano
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !chatWs.isConnected && accessToken) {
        chatWs.connect(accessToken, userId);
      }
    });

    return () => {
      chatWs.off('connected', onConnected);
      chatWs.off('disconnected', onDisconnected);
      appStateSub.remove();
      // La conexión NO se cierra al desmontar: el hook vive en el layout raíz
      // y solo debe cerrarse cuando el usuario hace logout (accessToken === null).
    };
  }, [accessToken, userId, setConnected]);
}
