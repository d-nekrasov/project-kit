import { useEffect, useRef, useState } from 'react';

import { getNotificationSoundEnabled } from '@/features/notifications/notification-sound-preferences';
import { playNotificationSound, unlockNotificationSound } from '@/features/notifications/notification-sound';

type UseNotificationAlertsParams = {
  count: number | null;
  userId: string | null | undefined;
  onNewNotifications?: () => void;
};

export function useNotificationAlerts({ count, userId, onNewNotifications }: UseNotificationAlertsParams) {
  const previousCountRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const highlightTimeoutRef = useRef<number | null>(null);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    const unlock = () => {
      if (getNotificationSoundEnabled()) {
        unlockNotificationSound();
      }
    };

    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    previousCountRef.current = null;
    initializedRef.current = false;
    setHighlight(false);

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
  }, [userId]);

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

    if (count > previous) {
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
    }

    previousCountRef.current = count;
  }, [count, onNewNotifications]);

  useEffect(
    () => () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    },
    []
  );

  return { highlight };
}
