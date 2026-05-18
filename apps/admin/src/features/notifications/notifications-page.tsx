import type { NotificationResponse } from '@project-kit/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { NotificationDetailDialog } from '@/features/notifications/notification-detail-dialog';
import { notificationsQueryKeys } from '@/features/notifications/notifications-query-keys';
import { NotificationsTable } from '@/features/notifications/notifications-table';
import { NotificationsToolbar, type NotificationStatusFilter } from '@/features/notifications/notifications-toolbar';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { sdk } from '@/lib/sdk';

export function NotificationsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<NotificationStatusFilter>('ALL');
  const [event, setEvent] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<NotificationResponse | null>(null);
  const [markReadId, setMarkReadId] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      status,
      event: event || undefined
    }),
    [event, limit, page, status]
  );

  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKeys.list(queryParams),
    queryFn: () =>
      sdk.notifications.my({
        page,
        limit,
        status: status === 'ALL' ? undefined : status,
        event: event || undefined
      })
  });

  const markReadMutation = useMutation({
    mutationFn: (notification: NotificationResponse) => {
      setMarkReadId(notification.id);
      return sdk.notifications.markRead(notification.id);
    },
    onSuccess: async (notification) => {
      setSelectedNotification((current) => (current?.id === notification.id ? notification : current));
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.all });
    },
    onSettled: () => setMarkReadId(null)
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => sdk.notifications.markAllRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.all });
    }
  });

  const meta = notificationsQuery.isError ? undefined : notificationsQuery.data?.meta;
  const notifications = notificationsQuery.isError ? [] : notificationsQuery.data?.items ?? [];
  const pageError = notificationsQuery.isError
    ? getApiErrorMessage(notificationsQuery.error)
    : markReadMutation.isError
      ? getApiErrorMessage(markReadMutation.error)
      : markAllReadMutation.isError
        ? getApiErrorMessage(markAllReadMutation.error)
        : null;

  if (auth.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-600">Personal notification inbox for your account.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || !notifications.length}
        >
          {markAllReadMutation.isPending ? 'Saving...' : 'Mark all read'}
        </Button>
      </div>

      <NotificationsToolbar
        event={event}
        onEventChange={(value) => {
          setEvent(value);
          setPage(1);
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />

      {pageError ? <ErrorState message={pageError} /> : null}

      <NotificationsTable
        notifications={notifications}
        isLoading={notificationsQuery.isLoading}
        markReadId={markReadId}
        onView={setSelectedNotification}
        onMarkRead={(notification) => markReadMutation.mutate(notification)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4 text-sm">
        <div className="text-slate-600">
          Page {meta?.page ?? page} of {meta?.totalPages ?? 1} • Total: {meta?.total ?? 0}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((value) => value - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => value + 1)}
            disabled={page >= (meta?.totalPages ?? 1)}
          >
            Next
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-600">Rows per page</span>
          <Select
            value={String(limit)}
            onChange={(inputEvent) => {
              setLimit(Number(inputEvent.target.value));
              setPage(1);
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </Select>
        </div>
      </div>

      <NotificationDetailDialog
        open={Boolean(selectedNotification)}
        notification={selectedNotification}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNotification(null);
          }
        }}
      />
    </div>
  );
}
