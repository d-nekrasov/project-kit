import type { NotificationChannel, NotificationTemplateResponse } from '@project-kit/sdk';
import { MoreHorizontal, Pencil } from 'lucide-react';

import { DataTableEmpty, DataTableShell, DataTableSkeleton } from '@/components/common/data-table-states';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
    return <DataTableSkeleton rows={4} />;
  }

  if (!templates.length) {
    return <DataTableEmpty title="No templates" description="Notification templates matching your search will appear here." />;
  }

  return (
    <DataTableShell>
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
              <TableCell className="font-medium text-foreground">{template.title}</TableCell>
              <TableCell>{template.emailSubject ?? '-'}</TableCell>
              <TableCell>{formatDate(template.updatedAt)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Open actions for ${template.event}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEdit(template)}>
                      <Pencil className="mr-2 inline h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
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
