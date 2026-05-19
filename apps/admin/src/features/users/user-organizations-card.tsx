import type { UserResponse } from '@project-kit/sdk';

import { DataTableEmpty, DataTableShell } from '@/components/common/data-table-states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type UserOrganizationsCardProps = {
  user: UserResponse;
  canManage?: boolean;
  onManage?: () => void;
};

export function UserOrganizationsCard({ user, canManage, onManage }: UserOrganizationsCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Organization memberships</CardTitle>
        {canManage ? (
          <Button type="button" size="sm" onClick={onManage}>
            Manage organizations
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {user.organizations.length ? (
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Org status</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Role</TableHead>
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
          <DataTableEmpty title="No organization memberships" description="This user is not assigned to any organization yet." />
        )}
      </CardContent>
    </Card>
  );
}
