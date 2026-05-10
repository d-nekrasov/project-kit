import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrganizationStatusBadge } from '@/features/organizations/organization-status-badge';
import type { OrganizationsTableProps } from '@/features/organizations/organizations-page.types';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function OrganizationsTableSkeleton() {
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

export function OrganizationsTable({
  organizations,
  isLoading,
  isSuperAdmin,
  activeOrganizationId,
  onEdit,
  onChangeStatus
}: OrganizationsTableProps) {
  if (isLoading) {
    return <OrganizationsTableSkeleton />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Created at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((organization) => (
              <TableRow key={organization.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{organization.name}</span>
                    {organization.id === activeOrganizationId ? (
                      <Badge className="bg-blue-100 text-blue-800">Current</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{organization.slug}</TableCell>
                <TableCell>
                  <OrganizationStatusBadge status={organization.status} />
                </TableCell>
                <TableCell>{organization.usersCount}</TableCell>
                <TableCell>{organization.rolesCount}</TableCell>
                <TableCell>{formatDate(organization.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(organization)}>
                      Edit
                    </Button>
                    {isSuperAdmin ? (
                      <Button type="button" variant="secondary" size="sm" onClick={() => onChangeStatus(organization)}>
                        Change status
                      </Button>
                    ) : null}
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
