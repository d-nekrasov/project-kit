import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionModuleBadge } from '@/features/permissions/permission-module-badge';
import type { PermissionsGroupedViewProps } from '@/features/permissions/permissions-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

function GroupedViewSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((__, rowIndex) => (
              <Skeleton key={rowIndex} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PermissionsGroupedView({ groups, isLoading }: PermissionsGroupedViewProps) {
  const { t } = useI18n();
  if (isLoading) {
    return <GroupedViewSkeleton />;
  }

  if (!groups.length) {
    return <EmptyState title={t('permissions.emptyGroupsTitle')} description={t('permissions.emptyGroupsDescription')} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <Card key={group.module}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              <PermissionModuleBadge module={group.module} />
            </CardTitle>
            <div className="text-sm text-muted-foreground">{t('permissions.groupedPermissions', { count: group.permissions.length })}</div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(
              group.permissions.reduce<Record<string, typeof group.permissions>>((acc, permission) => {
                const key = permission.resource || t('permissions.resourceOther');
                if (!acc[key]) {
                  acc[key] = [];
                }
                acc[key].push(permission);
                return acc;
              }, {})
            ).map(([resource, permissions]) => (
              <div key={`${group.module}-${resource}`} className="rounded-md border border-border p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{resource}</div>
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="space-y-1">
                      <Badge className="font-mono">{permission.code}</Badge>
                      <div className="text-sm text-foreground/80">{permission.description}</div>
                      <div className="text-xs text-muted-foreground">{permission.action ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
