import type { UserResponse } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserStatusBadge } from '@/features/users/user-status-badge';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

type UserDetailCardProps = {
  user: UserResponse;
};

export function UserDetailCard({ user }: UserDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">ID</dt>
            <dd className="mt-1 break-all text-sm text-slate-900">{user.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Status</dt>
            <dd className="mt-1">
              <UserStatusBadge status={user.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Name</dt>
            <dd className="mt-1 text-sm text-slate-900">{user.name || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Email</dt>
            <dd className="mt-1 text-sm text-slate-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Created</dt>
            <dd className="mt-1 text-sm text-slate-900">{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Updated</dt>
            <dd className="mt-1 text-sm text-slate-900">{formatDate(user.updatedAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-slate-500">System roles</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {user.systemRoleDetails.length ? (
                user.systemRoleDetails.map((role) => (
                  <Badge key={role.id}>
                    {role.name} ({role.code})
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-slate-500">None</span>
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
