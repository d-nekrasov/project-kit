import type { UserResponse } from '@project-kit/sdk';
import { Eye, MoreHorizontal, Pencil, ShieldAlert } from 'lucide-react';

import { CrudTableCard } from '@/components/common/crud-layout';
import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserStatusBadge } from '@/features/users/user-status-badge';
import type { UsersTableProps } from '@/features/users/users-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';
import type { TranslateWithFallback } from '@/lib/i18n/types';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function renderOrganizationRoles(user: UserResponse, t: TranslateWithFallback) {
  if (!user.organizations.length) {
    return <span className="text-muted-foreground">{t('users.table.noOrganizations')}</span>;
  }

  return (
    <div className="space-y-1">
      {user.organizations.map((org) => (
        <div key={org.id} className="text-xs text-foreground/80">
          <span className="font-medium">{org.name}:</span> {org.role}
        </div>
      ))}
    </div>
  );
}

function UsersTableSkeleton() {
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

export function UsersTable({ users, isLoading, onEdit, onChangeStatus, onViewDetails }: UsersTableProps) {
  const { t } = useI18n();

  if (isLoading) {
    return <UsersTableSkeleton />;
  }

  if (!users.length) {
    return <EmptyState title={t('users.emptyTitle')} description={t('users.emptyDescription')} />;
  }

  return (
    <CrudTableCard>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('common.email')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('users.table.organizationsRoles')}</TableHead>
              <TableHead>{t('users.table.systemRoles')}</TableHead>
              <TableHead>{t('common.createdAt')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <UserStatusBadge status={user.status} />
                </TableCell>
                <TableCell>{renderOrganizationRoles(user, t)}</TableCell>
                <TableCell>
                  {user.systemRoles.length ? (
                    <div className="flex flex-wrap gap-1">
                      {user.systemRoles.map((role) => (
                        <Badge key={role} className="bg-slate-100 text-foreground/80">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t('common.none')}</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button type="button" variant="ghost" size="sm" aria-label={t('users.table.openActions', { name: user.name })}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onViewDetails(user)}>
                        <Eye className="mr-2 inline h-4 w-4" />
                        {t('users.table.viewDetails')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Pencil className="mr-2 inline h-4 w-4" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeStatus(user)}>
                        <ShieldAlert className="mr-2 inline h-4 w-4" />
                        {t('users.table.changeStatus')}
                      </DropdownMenuItem>
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
