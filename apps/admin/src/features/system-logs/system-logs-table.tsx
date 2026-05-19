import { Ellipsis, Eye, IdCard } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SystemLogLevelBadge } from '@/features/system-logs/system-log-level-badge';
import { SystemLogSourceBadge } from '@/features/system-logs/system-log-source-badge';
import type { SystemLogsTableProps } from '@/features/system-logs/system-logs-page.types';

function SystemLogsTableSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

function truncate(value: string | null, max = 80) {
  if (!value) {
    return '—';
  }
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export function SystemLogsTable({ logs, isLoading, onViewDetails }: SystemLogsTableProps) {
  if (isLoading) {
    return <SystemLogsTableSkeleton />;
  }

  if (!logs.length) {
    return <EmptyState title="No system logs found" description="Try changing search query or filters." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created at</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <SystemLogLevelBadge level={log.level} />
                </TableCell>
                <TableCell>
                  <SystemLogSourceBadge source={log.source} />
                </TableCell>
                <TableCell className="max-w-[380px]">
                  <span className="block truncate break-all" title={log.message}>
                    {truncate(log.message, 120)}
                  </span>
                </TableCell>
                <TableCell>
                  {log.user ? (
                    <div className="space-y-0.5">
                      <div className="font-medium">{log.user.name}</div>
                      <div className="text-xs text-muted-foreground">{log.user.email}</div>
                    </div>
                  ) : log.userId ? (
                    <span className="font-mono text-xs text-muted-foreground">{truncate(log.userId, 40)}</span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  {log.organization ? (
                    <div className="space-y-0.5">
                      <div className="font-medium">{log.organization.name}</div>
                      <div className="text-xs text-muted-foreground">{log.organization.slug}</div>
                    </div>
                  ) : log.organizationId ? (
                    <span className="font-mono text-xs text-muted-foreground">{truncate(log.organizationId, 40)}</span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Open actions">
                        <Ellipsis className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onViewDetails(log)}>
                        <Eye className="mr-2 size-4" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigator.clipboard.writeText(log.id)}>
                        <IdCard className="mr-2 size-4" />
                        Copy log ID
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
