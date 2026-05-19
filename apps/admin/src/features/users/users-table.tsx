import type { UserResponse } from '@project-kit/sdk';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserStatusBadge } from '@/features/users/user-status-badge';
import type { UsersTableProps } from '@/features/users/users-page.types';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function renderOrganizationRoles(user: UserResponse) {
  if (!user.organizations.length) {
    return <span className="text-slate-500">No organizations</span>;
  }

  return (
    <div className="space-y-1">
      {user.organizations.map((org) => (
        <div key={org.id} className="text-xs text-slate-700">
          <span className="font-medium">{org.name}:</span> {org.role}
        </div>
      ))}
    </div>
  );
}

function UsersTableSkeleton() {
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

export function UsersTable({ users, isLoading, onEdit, onChangeStatus, onViewDetails }: UsersTableProps) {
  if (isLoading) {
    return <UsersTableSkeleton />;
  }

  if (!users.length) {
    return <EmptyState title="No users found" description="Try changing search or status filters." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Organizations / Roles</TableHead>
              <TableHead>System roles</TableHead>
              <TableHead>Created at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <UserStatusBadge status={user.status} />
                </TableCell>
                <TableCell>{renderOrganizationRoles(user)}</TableCell>
                <TableCell>{user.systemRoles.length ? user.systemRoles.join(', ') : 'None'}</TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(user)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onViewDetails(user)}>
                      View details
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => onChangeStatus(user)}>
                      Change status
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
