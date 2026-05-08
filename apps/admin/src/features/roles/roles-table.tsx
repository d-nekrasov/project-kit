import type { RoleResponse } from '@project-kit/sdk';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RolesTableProps } from '@/features/roles/roles-page.types';
import { RoleTypeBadge } from '@/features/roles/role-type-badge';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function isPermissionsProtected(role: RoleResponse) {
  return role.code === 'organization_admin';
}

function previewPermissions(role: RoleResponse) {
  if (!role.permissions.length) {
    return <span className="text-slate-500">0</span>;
  }

  const visible = role.permissions.slice(0, 3).map((permission) => permission.code);
  const hiddenCount = role.permissions.length - visible.length;

  return (
    <div className="space-y-1">
      <div className="text-sm text-slate-800">{role.permissions.length}</div>
      <div className="text-xs text-slate-600">
        {visible.join(', ')}
        {hiddenCount > 0 ? ` +${hiddenCount}` : ''}
      </div>
    </div>
  );
}

function RolesTableSkeleton() {
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

export function RolesTable({ roles, isLoading, onEdit, onEditPermissions }: RolesTableProps) {
  if (isLoading) {
    return <RolesTableSkeleton />;
  }

  if (!roles.length) {
    return <EmptyState title="No roles found" description="Try changing search or include system filters." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Created at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => {
              const isSystem = role.type === 'SYSTEM';
              const isProtected = isPermissionsProtected(role);
              const canEdit = !isSystem;
              const canEditPermissions = !isSystem && !isProtected;

              return (
                <TableRow key={role.id}>
                  <TableCell>{role.name}</TableCell>
                  <TableCell className="font-mono text-xs">{role.code}</TableCell>
                  <TableCell>
                    <RoleTypeBadge type={role.type} />
                  </TableCell>
                  <TableCell>{previewPermissions(role)}</TableCell>
                  <TableCell>{role.usersCount}</TableCell>
                  <TableCell>{formatDate(role.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onEdit(role)} disabled={!canEdit}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => onEditPermissions(role)}
                          disabled={!canEditPermissions}
                        >
                          Permissions
                        </Button>
                      </div>
                      {isSystem ? <span className="text-xs text-slate-500">System role is read-only</span> : null}
                      {isProtected ? (
                        <span className="text-xs text-amber-700">Permissions of organization_admin are protected</span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
