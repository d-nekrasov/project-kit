import type { UserResponse } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Organization</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Org status</th>
                  <th className="py-2 pr-4">Membership</th>
                  <th className="py-2 pr-4">Role</th>
                </tr>
              </thead>
              <tbody>
                {user.organizations.map((organization) => (
                  <tr key={organization.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium text-slate-900">{organization.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{organization.slug}</td>
                    <td className="py-3 pr-4">
                      <Badge>{organization.status}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge>{organization.membershipStatus}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {organization.roleName} ({organization.role})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No organization memberships.</p>
        )}
      </CardContent>
    </Card>
  );
}
