import type { NotificationConnectorResponse } from '@project-kit/sdk';
import { MoreHorizontal, Pencil } from 'lucide-react';

import { DataTableEmpty, DataTableShell, DataTableSkeleton } from '@/components/common/data-table-states';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NotificationChannelBadge } from '@/features/notification-settings/notification-channel-badge';
import { NotificationConnectorStatusBadge } from '@/features/notification-settings/notification-connector-status-badge';

type NotificationConnectorsTableProps = {
  connectors: NotificationConnectorResponse[];
  isLoading?: boolean;
  onEdit: (connector: NotificationConnectorResponse) => void;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function summarizeConfig(config: Record<string, unknown> | null) {
  if (!config || !Object.keys(config).length) {
    return '-';
  }

  return Object.entries(config)
    .filter(([key]) => key !== 'password')
    .map(([key, value]) => `${key}: ${String(value || '-')}`)
    .join(', ');
}

export function NotificationConnectorsTable({ connectors, isLoading, onEdit }: NotificationConnectorsTableProps) {
  if (isLoading) {
    return <DataTableSkeleton rows={4} />;
  }

  if (!connectors.length) {
    return <DataTableEmpty title="No connectors" description="Notification connectors will appear here after backend seed." />;
  }

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Config</TableHead>
            <TableHead>Updated at</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connectors.map((connector) => (
            <TableRow key={connector.id}>
              <TableCell className="font-mono text-xs">{connector.code}</TableCell>
              <TableCell>
                <NotificationChannelBadge channel={connector.channel} />
              </TableCell>
              <TableCell>
                <NotificationConnectorStatusBadge status={connector.status} />
              </TableCell>
              <TableCell className="max-w-md text-xs text-muted-foreground">{summarizeConfig(connector.config)}</TableCell>
              <TableCell>{formatDate(connector.updatedAt)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Open actions for ${connector.code}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEdit(connector)}>
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
