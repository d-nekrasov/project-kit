import type { UserResponse } from '@project-kit/sdk';

import { DataTableEmpty, DataTableShell } from '@/components/common/data-table-states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useI18n } from '@/lib/i18n/use-i18n';

type UserOrganizationsCardProps = {
  user: UserResponse;
  canManage?: boolean;
  onManage?: () => void;
};

export function UserOrganizationsCard({ user, canManage, onManage }: UserOrganizationsCardProps) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t('users.detail.membershipsTitle')}</CardTitle>
        {canManage ? (
          <Button type="button" size="sm" onClick={onManage}>
            {t('users.detail.manageOrganizations')}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {user.organizations.length ? (
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.organization')}</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>{t('users.detail.orgStatus')}</TableHead>
                  <TableHead>{t('users.detail.membership')}</TableHead>
                  <TableHead>{t('common.role')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.organizations.map((organization) => (
                  <TableRow key={organization.id}>
                    <TableCell className="font-medium text-foreground">{organization.name}</TableCell>
                    <TableCell className="text-muted-foreground">{organization.slug}</TableCell>
                    <TableCell>
                      <Badge>{organization.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{organization.membershipStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      {organization.roleName} ({organization.role})
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        ) : (
          <DataTableEmpty title={t('users.detail.emptyMembershipsTitle')} description={t('users.detail.emptyMembershipsDescription')} />
        )}
      </CardContent>
    </Card>
  );
}
