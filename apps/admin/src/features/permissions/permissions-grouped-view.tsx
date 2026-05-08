import { EmptyState } from '@/components/common/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionModuleBadge } from '@/features/permissions/permission-module-badge';
import type { PermissionsGroupedViewProps } from '@/features/permissions/permissions-page.types';

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
  if (isLoading) {
    return <GroupedViewSkeleton />;
  }

  if (!groups.length) {
    return <EmptyState title="No permission groups found" description="Try changing search query or module filter." />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <Card key={group.module}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              <PermissionModuleBadge module={group.module} />
            </CardTitle>
            <div className="text-sm text-slate-600">{group.permissions.length} permissions</div>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.permissions.map((permission) => (
              <div key={permission.id} className="rounded-md border border-slate-200 p-3">
                <div className="font-mono text-xs text-slate-900">{permission.code}</div>
                <div className="mt-1 text-sm text-slate-700">{permission.description}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {permission.resource ?? '—'} / {permission.action ?? '—'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
