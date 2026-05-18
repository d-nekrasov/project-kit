import type {
  NotificationRealtimeCreatedEvent,
  NotificationRealtimeReadEvent,
  NotificationsRealtimeReadAllEvent
} from '@project-kit/sdk';
import { useEffect, useRef, useState } from 'react';

import { API_BASE_URL, sdk } from '@/lib/sdk';

type StreamStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

type UseNotificationsStreamOptions = {
  enabled: boolean;
  userId?: string | null;
  onNotificationCreated?: (event: NotificationRealtimeCreatedEvent) => void;
  onNotificationRead?: (event: NotificationRealtimeReadEvent) => void;
  onNotificationsReadAll?: (event: NotificationsRealtimeReadAllEvent) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
};

const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

function parseEventData<T>(message: MessageEvent<string>): T | null {
  try {
    return JSON.parse(message.data) as T;
  } catch {
    return null;
  }
}

export function useNotificationsStream(options: UseNotificationsStreamOptions) {
  const [status, setStatus] = useState<StreamStatus>(options.enabled ? 'connecting' : 'idle');
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    if (!options.enabled) {
      setStatus('idle');
      reconnectAttemptRef.current = 0;
      return;
    }

    let closed = false;
    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const cleanupSource = () => {
      if (source) {
        source.close();
        source = null;
      }
    };

    const scheduleReconnect = () => {
      if (closed) {
        return;
      }

      const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS_MS.length - 1)];
      reconnectAttemptRef.current += 1;

      reconnectTimer = window.setTimeout(() => {
        void connect();
      }, delay);
    };

    const connect = async () => {
      cleanupSource();
      setStatus('connecting');

      try {
        const { token } = await sdk.notifications.streamToken();
        if (closed) {
          return;
        }

        const streamUrl = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
        source = new EventSource(streamUrl);

        source.addEventListener('connected', () => {
          reconnectAttemptRef.current = 0;
          setStatus('connected');
          options.onConnected?.();
        });

        source.addEventListener('notification.created', (message) => {
          const event = parseEventData<NotificationRealtimeCreatedEvent>(message as MessageEvent<string>);
          if (event) {
            options.onNotificationCreated?.(event);
          }
        });

        source.addEventListener('notification.read', (message) => {
          const event = parseEventData<NotificationRealtimeReadEvent>(message as MessageEvent<string>);
          if (event) {
            options.onNotificationRead?.(event);
          }
        });

        source.addEventListener('notifications.read_all', (message) => {
          const event = parseEventData<NotificationsRealtimeReadAllEvent>(message as MessageEvent<string>);
          if (event) {
            options.onNotificationsReadAll?.(event);
          }
        });

        source.onerror = () => {
          cleanupSource();
          setStatus('disconnected');
          options.onDisconnected?.();
          scheduleReconnect();
        };
      } catch {
        setStatus('disconnected');
        options.onDisconnected?.();
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      closed = true;
      cleanupSource();

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [
    options.enabled,
    options.userId,
    options.onConnected,
    options.onDisconnected,
    options.onNotificationCreated,
    options.onNotificationRead,
    options.onNotificationsReadAll
  ]);

  return {
    status,
    isConnected: status === 'connected'
  };
}
