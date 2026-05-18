import { ApiError } from '@project-kit/sdk';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { notificationsQueryKeys } from '@/features/notifications/notifications-query-keys';
import { sdk } from '@/lib/sdk';

function formatCount(count: number) {
  return count > 99 ? '99+' : String(count);
}

export function NotificationBell() {
  const auth = useAuth();
  const navigate = useNavigate();

  const unreadCountQuery = useQuery({
    queryKey: notificationsQueryKeys.unreadCount(),
    queryFn: () => sdk.notifications.unreadCount(),
    enabled: auth.isAuthenticated,
    refetchInterval: 30_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }

      return failureCount < 2;
    }
  });

  const count = unreadCountQuery.isError ? 0 : unreadCountQuery.data?.count ?? 0;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="relative h-10 w-10 px-0"
      aria-label="Notifications"
      onClick={() => navigate('/notifications')}
    >
      <Bell className="h-5 w-5" />
      {count > 0 ? (
        <span className="absolute right-0 top-0 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
          {formatCount(count)}
        </span>
      ) : null}
    </Button>
  );
}
