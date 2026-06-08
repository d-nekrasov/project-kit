import { MoreHorizontal, Pencil, ShieldAlert } from 'lucide-react';

import { CrudTableCard } from '@/components/common/crud-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrganizationStatusBadge } from '@/features/organizations/organization-status-badge';
import type { OrganizationsTableProps } from '@/features/organizations/organizations-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function OrganizationsTableSkeleton() {
  return (
    <CrudTableCard>
      <CardContent className="p-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </CardContent>
    </CrudTableCard>
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
  const { t } = useI18n();

  if (isLoading) {
    return <OrganizationsTableSkeleton />;
  }

  return (
    <CrudTableCard>
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
                    <span className="font-medium">{organization.name}</span>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button type="button" variant="ghost" size="sm" aria-label={`Open actions for ${organization.name}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onEdit(organization)}>
                        <Pencil className="mr-2 inline h-4 w-4" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      {isSuperAdmin ? (
                        <DropdownMenuItem onClick={() => onChangeStatus(organization)}>
                          <ShieldAlert className="mr-2 inline h-4 w-4" />
                          Change status
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CrudTableCard>
  );
}
