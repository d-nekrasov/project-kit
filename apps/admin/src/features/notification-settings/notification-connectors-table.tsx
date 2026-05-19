import type { NotificationConnectorResponse } from '@project-kit/sdk';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

  if (!connectors.length) {
    return <EmptyState title="No connectors" description="Notification connectors will appear here after backend seed." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
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
                <TableCell className="max-w-md text-xs text-slate-600">{summarizeConfig(connector.config)}</TableCell>
                <TableCell>{formatDate(connector.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="outline" size="sm" onClick={() => onEdit(connector)}>
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
