import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PermissionModuleBadge } from '@/features/permissions/permission-module-badge';
import type { PermissionsTableProps } from '@/features/permissions/permissions-page.types';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function PermissionsTableSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-2">
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function PermissionsTable({ permissions, isLoading }: PermissionsTableProps) {
  if (isLoading) {
    return <PermissionsTableSkeleton />;
  }

  if (!permissions.length) {
    return <EmptyState title="No permissions found" description="Try changing search query or module filter." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell>
                  <Badge className="font-mono">{permission.code}</Badge>
                </TableCell>
                <TableCell>
                  <PermissionModuleBadge module={permission.module} />
                </TableCell>
                <TableCell>{permission.resource ?? '—'}</TableCell>
                <TableCell>{permission.action ?? '—'}</TableCell>
                <TableCell>{permission.description}</TableCell>
                <TableCell>{formatDate(permission.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
