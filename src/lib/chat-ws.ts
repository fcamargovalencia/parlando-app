import { WS_BASE_URL } from '@/constants/config';
import type { WsInboundFrame, WsOutboundFrame } from '@/types/api';

// ── Tipos internos ──

type WsEvent = 'message' | 'connected' | 'disconnected' | 'error';
type WsCallback<T = unknown> = (data: T) => void;

// ── Constantes ──

const PING_INTERVAL_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_MAX_ATTEMPTS = 10;

// ── Servicio ──

class ChatWebSocketService {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private token: string | null = null;
  private listeners = new Map<WsEvent, Set<WsCallback<any>>>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private intentionalClose = false;

  // ── API pública ──

  connect(token: string, userId: string): void {
    // Guardar también contra CONNECTING para no abrir una segunda conexión paralela
    if (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    ) return;
    this.token = token;
    this.userId = userId;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.open();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
  }

  send(frame: WsOutboundFrame): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(frame));
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ── Event emitter ──

  on<T>(event: WsEvent, cb: WsCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb as WsCallback<unknown>);
  }

  off<T>(event: WsEvent, cb: WsCallback<T>): void {
    this.listeners.get(event)?.delete(cb as WsCallback<unknown>);
  }

  // ── Interno ──

  private emit<T>(event: WsEvent, data: T): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  private open(): void {
    // Anular handlers de la conexión anterior antes de reemplazarla,
    // para que sus eventos no lleguen a la nueva instancia.
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
    }
    const url = `${WS_BASE_URL}/ws/chat?token=${encodeURIComponent(this.token!)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.send({ type: 'SUBSCRIBE', userId: this.userId! });
      this.startPing();
      this.emit('connected', undefined);
    };

    this.ws.onmessage = (event) => {
      try {
        const frame: WsInboundFrame = JSON.parse(event.data as string);
        if (frame.type === 'PONG') return;
        if (frame.type === 'MESSAGE') {
          this.emit('message', frame);
        }
        if (frame.type === 'ERROR') this.emit('error', frame);
      } catch {
        // Frame malformado — ignorar
      }
    };

    this.ws.onerror = () => {
      this.emit('error', { type: 'ERROR', message: 'WebSocket error' } as WsInboundFrame);
    };

    this.ws.onclose = (event) => {
      this.clearTimers();
      this.emit('disconnected', undefined);
      // Código 4401: token inválido/expirado — no reconectar automáticamente
      if (!this.intentionalClose && event.code !== 4401) {
        this.scheduleReconnect();
      }
    };
  }

  private startPing(): void {
    this.clearPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'PING' });
    }, PING_INTERVAL_MS);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) return;
    const delay = Math.min(
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_MS,
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  private clearPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearPing();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const chatWs = new ChatWebSocketService();
