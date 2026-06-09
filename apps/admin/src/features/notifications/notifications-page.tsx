import type { NotificationResponse } from '@project-kit/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { NotificationDetailDialog } from '@/features/notifications/notification-detail-dialog';
import { enableNotificationSound } from '@/features/notifications/notification-sound';
import {
  getNotificationSoundEnabled,
  setNotificationSoundEnabled
} from '@/features/notifications/notification-sound-preferences';
import { notificationsQueryKeys } from '@/features/notifications/notifications-query-keys';
import { NotificationsTable } from '@/features/notifications/notifications-table';
import { NotificationsToolbar, type NotificationStatusFilter } from '@/features/notifications/notifications-toolbar';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useI18n } from '@/lib/i18n/use-i18n';
import { sdk } from '@/lib/sdk';

export function NotificationsPage() {
  const auth = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<NotificationStatusFilter>('ALL');
  const [event, setEvent] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<NotificationResponse | null>(null);
  const [markReadId, setMarkReadId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(getNotificationSoundEnabled);
  const [soundSetupError, setSoundSetupError] = useState<string | null>(null);
  const [isSoundSetupPending, setIsSoundSetupPending] = useState(false);

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
      }),
    enabled: auth.isAuthenticated
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

  const setSoundEnabled = async (enabled: boolean) => {
    setSoundSetupError(null);

    if (enabled) {
      setIsSoundSetupPending(true);
      const isReady = await enableNotificationSound({ test: true });
      setIsSoundSetupPending(false);

      if (!isReady) {
        setNotificationSoundEnabled(false);
        setSoundEnabledState(false);
        setSoundSetupError('Browser blocked notification sound. Use this button after interacting with the page.');
        return;
      }
    }

    setNotificationSoundEnabled(enabled);
    setSoundEnabledState(enabled);
  };

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
          <h2 className="text-2xl font-semibold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">Personal notification inbox for your account.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground/80">
            <span>Notification sound</span>
            <Button
              type="button"
              variant={soundEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => void setSoundEnabled(!soundEnabled)}
              aria-pressed={soundEnabled}
              disabled={isSoundSetupPending}
            >
              {isSoundSetupPending ? 'Testing...' : soundEnabled ? 'On' : 'Off'}
            </Button>
          </div>
          {soundSetupError ? <div className="text-sm text-red-600">{soundSetupError}</div> : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || !notifications.length}
          >
            {markAllReadMutation.isPending ? 'Saving...' : 'Mark all read'}
          </Button>
        </div>
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 text-sm">
        <div className="text-muted-foreground">
          {t('common.pageOfTotal', { page: meta?.page ?? page, totalPages: meta?.totalPages ?? 1 })} •{' '}
          {t('common.totalCount', { total: meta?.total ?? 0 })}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((value) => value - 1)} disabled={page <= 1}>
            {t('common.previous')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => value + 1)}
            disabled={page >= (meta?.totalPages ?? 1)}
          >
            {t('common.next')}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('common.rowsPerPage')}</span>
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
