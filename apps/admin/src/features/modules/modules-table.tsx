import type { ModuleRegistryResponse } from '@project-kit/sdk';

import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ModuleStatusBadge } from '@/features/modules/module-status-badge';
import type { ModulesTableProps } from '@/features/modules/modules-page.types';

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

function ModulesTableSkeleton() {
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

function isCoreModule(module: ModuleRegistryResponse) {
  return module.name === 'core';
}

export function ModulesTable({ modules, isLoading, isSuperAdmin, onViewManifest, onChangeStatus }: ModulesTableProps) {
  if (isLoading) {
    return <ModulesTableSkeleton />;
  }

  if (!modules.length) {
    return <EmptyState title="No modules found" description="Try changing search or status filters." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Menu items</TableHead>
              <TableHead>Installed at</TableHead>
              <TableHead>Updated at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => {
              const core = isCoreModule(module);
              const permissionsCount = module.manifest?.permissions?.length ?? 0;
              const adminMenuCount = module.manifest?.adminMenu?.length ?? 0;

              return (
                <TableRow key={module.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{module.title}</span>
                      {core ? <Badge className="bg-blue-100 text-blue-700">core</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{module.name}</TableCell>
                  <TableCell>{module.version}</TableCell>
                  <TableCell>
                    <ModuleStatusBadge status={module.status} />
                  </TableCell>
                  <TableCell>{permissionsCount}</TableCell>
                  <TableCell>{adminMenuCount}</TableCell>
                  <TableCell>{formatDate(module.installedAt)}</TableCell>
                  <TableCell>{formatDate(module.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => onViewManifest(module)}>
                        View manifest
                      </Button>

                      {isSuperAdmin ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={core}
                          title={core ? 'Core module cannot be disabled.' : undefined}
                          onClick={() => onChangeStatus(module)}
                        >
                          Change status
                        </Button>
                      ) : null}
                    </div>
                    {isSuperAdmin && core ? <div className="mt-1 text-xs text-amber-700">Core module cannot be disabled.</div> : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
