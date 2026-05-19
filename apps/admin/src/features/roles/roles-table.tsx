import type { RoleResponse } from '@project-kit/sdk';
import { MoreHorizontal, Pencil, ShieldAlert } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
    return <span className="text-muted-foreground">0</span>;
  }

  const visible = role.permissions.slice(0, 3).map((permission) => permission.code);
  const hiddenCount = role.permissions.length - visible.length;

  return (
    <div className="space-y-1">
      <div className="text-sm text-foreground">{role.permissions.length}</div>
      <div className="flex flex-wrap gap-1">
        {visible.map((code) => (
          <Badge key={code} className="font-mono">
            {code}
          </Badge>
        ))}
        {hiddenCount > 0 ? (
          <Badge className="bg-slate-200 text-foreground/80">+{hiddenCount}</Badge>
        ) : null}
      </div>
    </div>
  );
}

function RolesTableSkeleton() {
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

export function RolesTable({ roles, isLoading, onEdit, onEditPermissions }: RolesTableProps) {
  if (isLoading) {
    return <RolesTableSkeleton />;
  }

  if (!roles.length) {
    return <EmptyState title="No roles found" description="Try changing search or include system filters." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
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
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button type="button" variant="ghost" size="sm" aria-label={`Open actions for ${role.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onEdit(role)} disabled={!canEdit}>
                          <Pencil className="mr-2 inline h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditPermissions(role)} disabled={!canEditPermissions}>
                          <ShieldAlert className="mr-2 inline h-4 w-4" />
                          Permissions
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
