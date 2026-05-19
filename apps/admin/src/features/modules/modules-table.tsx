import type { ModuleRegistryResponse } from '@project-kit/sdk';
import { Eye, MoreHorizontal, Power } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ModulesTableProps } from '@/features/modules/modules-page.types';

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

function renderStatusBadge(status: ModuleRegistryResponse['status']) {
  if (status === 'ENABLED') {
    return <Badge className="bg-emerald-100 text-emerald-800">Enabled</Badge>;
  }

  return <Badge className="bg-slate-200 text-slate-700">Disabled</Badge>;
}

function previewPermissions(module: ModuleRegistryResponse) {
  const permissions = module.manifest?.permissions ?? [];
  if (!permissions.length) {
    return <span className="text-slate-500">—</span>;
  }

  const visible = permissions.slice(0, 2);
  const hiddenCount = permissions.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((code) => (
        <Badge key={code} className="font-mono text-[11px]">
          {code}
        </Badge>
      ))}
      {hiddenCount > 0 ? <Badge className="bg-slate-200 text-slate-700">+{hiddenCount}</Badge> : null}
    </div>
  );
}

function previewSettings(module: ModuleRegistryResponse) {
  const schema = module.manifest?.settingsSchema;
  if (!schema || typeof schema !== 'object') {
    return <span className="text-slate-500">—</span>;
  }

  const fieldsCount = Object.keys(schema).length;
  return <Badge className="bg-blue-100 text-blue-700">{fieldsCount > 0 ? `${fieldsCount} fields` : 'Available'}</Badge>;
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
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Settings</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => {
              const core = isCoreModule(module);
              const description = module.description ?? module.manifest?.description ?? '—';

              return (
                <TableRow key={module.id}>
                  <TableCell className="font-mono text-xs">{module.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{module.title}</span>
                      {core ? <Badge className="bg-blue-100 text-blue-700">core</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>{module.version}</TableCell>
                  <TableCell>{renderStatusBadge(module.status)}</TableCell>
                  <TableCell>
                    <p className="max-w-[380px] truncate text-sm text-slate-700" title={description}>
                      {description}
                    </p>
                  </TableCell>
                  <TableCell>{previewPermissions(module)}</TableCell>
                  <TableCell>{previewSettings(module)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button type="button" variant="ghost" size="sm" aria-label={`Open actions for ${module.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onViewManifest(module)}>
                          <Eye className="mr-2 inline h-4 w-4" />
                          View manifest
                        </DropdownMenuItem>
                        {isSuperAdmin ? (
                          <DropdownMenuItem onClick={() => onChangeStatus(module)} disabled={core}>
                            <Power className="mr-2 inline h-4 w-4" />
                            {module.status === 'ENABLED' ? 'Disable module' : 'Enable module'}
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
