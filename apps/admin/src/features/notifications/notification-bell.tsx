import { ApiError } from '@project-kit/sdk';
import type {
  NotificationRealtimeCreatedEvent,
  NotificationRealtimeReadEvent,
  NotificationsRealtimeReadAllEvent
} from '@project-kit/sdk';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { notificationsQueryKeys } from '@/features/notifications/notifications-query-keys';
import { useNotificationAlerts } from '@/features/notifications/use-notification-alerts';
import { useNotificationsStream } from '@/features/notifications/use-notifications-stream';
import { sdk } from '@/lib/sdk';
import { cn } from '@/lib/utils';

function formatCount(count: number) {
  return count > 99 ? '99+' : String(count);
}

export function NotificationBell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isStreamConnected, setIsStreamConnected] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setIsStreamConnected(false);
    }
  }, [auth.isAuthenticated]);

  const handleNewNotifications = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() });
  }, [queryClient]);

  const unreadCountQuery = useQuery({
    queryKey: notificationsQueryKeys.unreadCount(),
    queryFn: () => sdk.notifications.unreadCount(),
    enabled: auth.isAuthenticated,
    refetchInterval: isStreamConnected ? false : 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }

      return failureCount < 2;
    }
  });

  const count = unreadCountQuery.isError ? null : unreadCountQuery.data?.count ?? null;
  const { highlight, triggerAlert } = useNotificationAlerts({
    count,
    userId: auth.user?.id,
    fallbackDetectionEnabled: !isStreamConnected,
    onNewNotifications: handleNewNotifications
  });
  useNotificationsStream({
    enabled: auth.isAuthenticated,
    userId: auth.user?.id,
    onConnected: useCallback(() => {
      setIsStreamConnected(true);
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.unreadCount() });
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() });
    }, [queryClient]),
    onDisconnected: useCallback(() => {
      setIsStreamConnected(false);
    }, []),
    onNotificationCreated: useCallback(
      (event: NotificationRealtimeCreatedEvent) => {
        queryClient.setQueryData(notificationsQueryKeys.unreadCount(), { count: event.unreadCount });
        void queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() });
        triggerAlert();
      },
      [queryClient, triggerAlert]
    ),
    onNotificationRead: useCallback(
      (event: NotificationRealtimeReadEvent) => {
        queryClient.setQueryData(notificationsQueryKeys.unreadCount(), { count: event.unreadCount });
        void queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() });
      },
      [queryClient]
    ),
    onNotificationsReadAll: useCallback(
      (event: NotificationsRealtimeReadAllEvent) => {
        queryClient.setQueryData(notificationsQueryKeys.unreadCount(), { count: event.unreadCount });
        void queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() });
      },
      [queryClient]
    )
  });
  const visibleCount = count ?? 0;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('relative h-10 w-10 px-0', highlight && 'animate-pulse text-red-600')}
      aria-label="Notifications"
      title={isStreamConnected ? 'Notifications: realtime connected' : 'Notifications: fallback mode'}
      onClick={() => navigate('/notifications')}
    >
      <Bell className="h-5 w-5" />
      {visibleCount > 0 ? (
        <span className="absolute right-0 top-0 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
          {formatCount(visibleCount)}
        </span>
      ) : null}
    </Button>
  );
}
