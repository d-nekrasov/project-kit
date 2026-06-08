import type { ModuleRegistryResponse } from '@project-kit/sdk';
import { Eye, MoreHorizontal, Power } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ModulesTableProps } from '@/features/modules/modules-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';
import { translateWithFallback } from '@/lib/i18n/translate-with-fallback';

function ModulesTableSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-2">
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

function ModuleStatusCell({ status }: { status: ModuleRegistryResponse['status'] }) {
  const { t } = useI18n();
  if (status === 'ENABLED') {
    return <Badge className="bg-emerald-100 text-emerald-800">{t('modules.status.enabled')}</Badge>;
  }

  return <Badge className="bg-slate-200 text-foreground/80">{t('modules.status.disabled')}</Badge>;
}

function previewPermissions(module: ModuleRegistryResponse) {
  const permissions = module.manifest?.permissions ?? [];
  if (!permissions.length) {
    return <span className="text-muted-foreground">—</span>;
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
      {hiddenCount > 0 ? <Badge className="bg-slate-200 text-foreground/80">+{hiddenCount}</Badge> : null}
    </div>
  );
}

function previewSettings(module: ModuleRegistryResponse) {
  const schema = module.manifest?.settingsSchema;
  if (!schema || typeof schema !== 'object') {
    return <span className="text-muted-foreground">—</span>;
  }

  const fieldsCount = Object.keys(schema).length;
  return <ModuleSettingsPreview fieldsCount={fieldsCount} />;
}

function ModuleSettingsPreview({ fieldsCount }: { fieldsCount: number }) {
  const { t } = useI18n();
  return (
    <Badge className="bg-blue-100 text-blue-700">
      {fieldsCount > 0 ? t('modules.settings.fields', { count: fieldsCount }) : t('modules.settings.available')}
    </Badge>
  );
}

export function ModulesTable({ modules, isLoading, isSuperAdmin, onViewManifest, onChangeStatus }: ModulesTableProps) {
  const { t } = useI18n();
  if (isLoading) {
    return <ModulesTableSkeleton />;
  }

  if (!modules.length) {
    return <EmptyState title={t('modules.empty.title')} description={t('modules.empty.description')} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('modules.table.name')}</TableHead>
              <TableHead>{t('modules.table.title')}</TableHead>
              <TableHead>{t('modules.table.version')}</TableHead>
              <TableHead>{t('modules.table.status')}</TableHead>
              <TableHead>{t('modules.table.description')}</TableHead>
              <TableHead>{t('modules.table.permissions')}</TableHead>
              <TableHead>{t('modules.table.settings')}</TableHead>
              <TableHead className="text-right">{t('modules.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => {
              const core = isCoreModule(module);
              const title = translateWithFallback(t, module.manifest?.titleKey, module.title);
              const description = translateWithFallback(
                t,
                module.manifest?.descriptionKey,
                module.description ?? module.manifest?.description ?? '—'
              );

              return (
                <TableRow key={module.id}>
                  <TableCell className="font-mono text-xs">{module.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{title}</span>
                      {core ? <Badge className="bg-blue-100 text-blue-700">{t('modules.coreBadge')}</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>{module.version}</TableCell>
                  <TableCell>
                    <ModuleStatusCell status={module.status} />
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[380px] truncate text-sm text-foreground/80" title={description}>
                      {description}
                    </p>
                  </TableCell>
                  <TableCell>{previewPermissions(module)}</TableCell>
                  <TableCell>{previewSettings(module)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button type="button" variant="ghost" size="sm" aria-label={t('modules.actions.open', { name: module.name })}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onViewManifest(module)}>
                          <Eye className="mr-2 inline h-4 w-4" />
                          {t('modules.actions.viewManifest')}
                        </DropdownMenuItem>
                        {isSuperAdmin ? (
                          <DropdownMenuItem onClick={() => onChangeStatus(module)} disabled={core}>
                            <Power className="mr-2 inline h-4 w-4" />
                            {module.status === 'ENABLED' ? t('modules.actions.disable') : t('modules.actions.enable')}
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
