import type { UserResponse } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserStatusBadge } from '@/features/users/user-status-badge';
import { useI18n } from '@/lib/i18n/use-i18n';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

type UserDetailCardProps = {
  user: UserResponse;
};

export function UserDetailCard({ user }: UserDetailCardProps) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('users.detail.detailsTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">{t('users.detail.id')}</dt>
            <dd className="mt-1 break-all text-sm text-foreground">{user.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">{t('common.status')}</dt>
            <dd className="mt-1">
              <UserStatusBadge status={user.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">{t('common.name')}</dt>
            <dd className="mt-1 text-sm text-foreground">{user.name || t('common.notSet')}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">{t('common.email')}</dt>
            <dd className="mt-1 text-sm text-foreground">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">{t('users.detail.created')}</dt>
            <dd className="mt-1 text-sm text-foreground">{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">{t('users.detail.updated')}</dt>
            <dd className="mt-1 text-sm text-foreground">{formatDate(user.updatedAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-muted-foreground">{t('users.detail.systemRoles')}</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {user.systemRoleDetails.length ? (
                user.systemRoleDetails.map((role) => (
                  <Badge key={role.id}>
                    {role.name} ({role.code})
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">{t('common.none')}</span>
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
