import { useCallback, useEffect, useRef, useState } from 'react';

import { getNotificationSoundEnabled } from '@/features/notifications/notification-sound-preferences';
import { enableNotificationSound, isNotificationSoundReady, playNotificationSound } from '@/features/notifications/notification-sound';

type UseNotificationAlertsParams = {
  count: number | null;
  userId: string | null | undefined;
  fallbackDetectionEnabled?: boolean;
  onNewNotifications?: () => void;
};

export function useNotificationAlerts({ count, userId, fallbackDetectionEnabled = true, onNewNotifications }: UseNotificationAlertsParams) {
  const previousCountRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const highlightTimeoutRef = useRef<number | null>(null);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (!getNotificationSoundEnabled() || isNotificationSoundReady()) {
      return;
    }

    let disposed = false;

    const armSound = () => {
      void enableNotificationSound().then((ready) => {
        if (ready || disposed) {
          window.removeEventListener('pointerdown', armSound, true);
          window.removeEventListener('click', armSound, true);
          window.removeEventListener('keydown', armSound, true);
          window.removeEventListener('touchstart', armSound, true);
        }
      });
    };

    window.addEventListener('pointerdown', armSound, true);
    window.addEventListener('click', armSound, true);
    window.addEventListener('keydown', armSound, true);
    window.addEventListener('touchstart', armSound, true);

    return () => {
      disposed = true;
      window.removeEventListener('pointerdown', armSound, true);
      window.removeEventListener('click', armSound, true);
      window.removeEventListener('keydown', armSound, true);
      window.removeEventListener('touchstart', armSound, true);
    };
  }, [userId]);

  useEffect(() => {
    previousCountRef.current = null;
    initializedRef.current = false;
    setHighlight(false);

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
  }, [userId]);

  const triggerAlert = useCallback(() => {
    onNewNotifications?.();
    setHighlight(true);

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlight(false);
      highlightTimeoutRef.current = null;
    }, 2_000);

    if (getNotificationSoundEnabled()) {
      playNotificationSound();
    }
  }, [onNewNotifications]);

  useEffect(() => {
    if (count === null) {
      return;
    }

    if (!initializedRef.current) {
      previousCountRef.current = count;
      initializedRef.current = true;
      return;
    }

    const previous = previousCountRef.current ?? 0;

    if (fallbackDetectionEnabled && count > previous) {
      triggerAlert();
    }

    previousCountRef.current = count;
  }, [count, fallbackDetectionEnabled, onNewNotifications, triggerAlert]);

  useEffect(
    () => () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    },
    []
  );

  return { highlight, triggerAlert };
}
