import type { NotificationChannel, NotificationTemplateResponse } from '@project-kit/sdk';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NotificationChannelBadge } from '@/features/notification-settings/notification-channel-badge';

type NotificationTemplatesTableProps = {
  templates: NotificationTemplateResponse[];
  isLoading?: boolean;
  onEdit: (template: NotificationTemplateResponse) => void;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function normalizeChannels(channels: unknown): NotificationChannel[] {
  return Array.isArray(channels) ? (channels as NotificationChannel[]) : [];
}

export function NotificationTemplatesTable({ templates, isLoading, onEdit }: NotificationTemplatesTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-2">
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!templates.length) {
    return <EmptyState title="No templates" description="Notification templates matching your search will appear here." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Email subject</TableHead>
              <TableHead>Updated at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-mono text-xs">{template.event}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {normalizeChannels(template.channels).map((channel) => (
                      <NotificationChannelBadge key={channel} channel={channel} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="font-medium text-slate-900">{template.title}</TableCell>
                <TableCell>{template.emailSubject ?? '-'}</TableCell>
                <TableCell>{formatDate(template.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="outline" size="sm" onClick={() => onEdit(template)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
