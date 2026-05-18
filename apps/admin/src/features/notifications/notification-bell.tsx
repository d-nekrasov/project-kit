import { ApiError } from '@project-kit/sdk';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { notificationsQueryKeys } from '@/features/notifications/notifications-query-keys';
import { useNotificationAlerts } from '@/features/notifications/use-notification-alerts';
import { sdk } from '@/lib/sdk';
import { cn } from '@/lib/utils';

function formatCount(count: number) {
  return count > 99 ? '99+' : String(count);
}

export function NotificationBell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleNewNotifications = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() });
  }, [queryClient]);

  const unreadCountQuery = useQuery({
    queryKey: notificationsQueryKeys.unreadCount(),
    queryFn: () => sdk.notifications.unreadCount(),
    enabled: auth.isAuthenticated,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }

      return failureCount < 2;
    }
  });

  const count = unreadCountQuery.isError ? null : unreadCountQuery.data?.count ?? null;
  const { highlight } = useNotificationAlerts({
    count,
    userId: auth.user?.id,
    onNewNotifications: handleNewNotifications
  });
  const visibleCount = count ?? 0;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('relative h-10 w-10 px-0', highlight && 'animate-pulse text-red-600')}
      aria-label="Notifications"
      title="Notifications"
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
