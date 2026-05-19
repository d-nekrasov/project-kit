import type { NotificationResponse } from '@project-kit/sdk';
import { Eye, MoreHorizontal, ShieldCheck } from 'lucide-react';

import { DataTableEmpty, DataTableShell, DataTableSkeleton } from '@/components/common/data-table-states';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

export function NotificationsTable({
  notifications,
  isLoading,
  markReadId,
  onView,
  onMarkRead
}: NotificationsTableProps) {
  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (!notifications.length) {
    return <DataTableEmpty title="No notifications" description="Notifications addressed to your account will appear here." />;
  }

  return (
    <DataTableShell>
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
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Open actions for ${notification.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onView(notification)}>
                      <Eye className="mr-2 inline h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    {notification.status === 'UNREAD' ? (
                      <DropdownMenuItem onClick={() => onMarkRead(notification)} disabled={markReadId === notification.id}>
                        <ShieldCheck className="mr-2 inline h-4 w-4" />
                        {markReadId === notification.id ? 'Saving...' : 'Mark read'}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
