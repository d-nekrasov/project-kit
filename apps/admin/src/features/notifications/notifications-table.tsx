import type { NotificationResponse } from '@project-kit/sdk';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NotificationStatusBadge } from '@/features/notifications/notification-status-badge';

type NotificationsTableProps = {
  notifications: NotificationResponse[];
  isLoading?: boolean;
  markReadId?: string | null;
  onView: (notification: NotificationResponse) => void;
  onMarkRead: (notification: NotificationResponse) => void;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function preview(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

function formatDeliveries(notification: NotificationResponse) {
  if (!notification.deliveries.length) {
    return '-';
  }

  return notification.deliveries.map((delivery) => `${delivery.channel}:${delivery.status}`).join(', ');
}

function NotificationsTableSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-2">
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function NotificationsTable({
  notifications,
  isLoading,
  markReadId,
  onView,
  onMarkRead
}: NotificationsTableProps) {
  if (isLoading) {
    return <NotificationsTableSkeleton />;
  }

  if (!notifications.length) {
    return <EmptyState title="No notifications" description="Notifications addressed to your account will appear here." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created at</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Deliveries</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>{formatDate(notification.createdAt)}</TableCell>
                <TableCell>
                  <NotificationStatusBadge status={notification.status} />
                </TableCell>
                <TableCell className="font-mono text-xs">{notification.event}</TableCell>
                <TableCell className="font-medium text-slate-900">{notification.title}</TableCell>
                <TableCell className="max-w-md text-sm text-slate-600">{preview(notification.message)}</TableCell>
                <TableCell className="text-xs text-slate-600">{formatDeliveries(notification)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onView(notification)}>
                      View
                    </Button>
                    {notification.status === 'UNREAD' ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onMarkRead(notification)}
                        disabled={markReadId === notification.id}
                      >
                        {markReadId === notification.id ? 'Saving...' : 'Mark read'}
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
