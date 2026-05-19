import type { NotificationResponse } from '@project-kit/sdk';

import { JsonViewer } from '@/components/common/json-viewer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NotificationStatusBadge } from '@/features/notifications/notification-status-badge';

type NotificationDetailDialogProps = {
  open: boolean;
  notification: NotificationResponse | null;
  onOpenChange: (open: boolean) => void;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

export function NotificationDetailDialog({ open, notification, onOpenChange }: NotificationDetailDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{notification?.title ?? 'Notification'}</DialogTitle>
          <DialogDescription>{notification?.event}</DialogDescription>
        </DialogHeader>

        {notification ? (
          <div className="space-y-5">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</div>
                <div className="mt-1">
                  <NotificationStatusBadge status={notification.status} />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Created at</div>
                <div className="mt-1 text-slate-700">{formatDate(notification.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Read at</div>
                <div className="mt-1 text-slate-700">{formatDate(notification.readAt)}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Organization</div>
                <div className="mt-1 font-mono text-xs text-slate-700">{notification.organizationId ?? '-'}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Message</div>
              <p className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">{notification.message}</p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Payload</div>
              <JsonViewer value={notification.payload} emptyText="No payload." />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Deliveries</div>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Connector</TableHead>
                      <TableHead>Sent at</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notification.deliveries.length ? (
                      notification.deliveries.map((delivery) => (
                        <TableRow key={delivery.id}>
                          <TableCell>{delivery.channel}</TableCell>
                          <TableCell>{delivery.status}</TableCell>
                          <TableCell>{delivery.connectorCode ?? '-'}</TableCell>
                          <TableCell>{formatDate(delivery.sentAt)}</TableCell>
                          <TableCell className="max-w-xs text-xs text-red-700">{delivery.error ?? '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-slate-500">
                          No deliveries.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
