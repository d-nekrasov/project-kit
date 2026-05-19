import type { ModuleRegistryResponse, SettingResponse } from '@project-kit/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { LoadingScreen } from '@/components/common/loading-screen';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { ModuleSettingsSchemaDialog } from '@/features/settings/module-settings-schema-dialog';
import { SettingFormDialog } from '@/features/settings/setting-form-dialog';
import type { SettingFormDialogSubmitValues, SettingsScopeFilter } from '@/features/settings/settings-page.types';
import { settingsQueryKeys } from '@/features/settings/settings-query-keys';
import { SettingsTable } from '@/features/settings/settings-table';
import { SettingsToolbar } from '@/features/settings/settings-toolbar';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { sdk } from '@/lib/sdk';

export function SettingsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { user } = auth;
  const isSuperAdmin = user?.systemRoles.includes('super_admin') ?? false;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<SettingsScopeFilter>('ALL');
  const [module, setModule] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SettingResponse | null>(null);
  const [schemaModule, setSchemaModule] = useState<ModuleRegistryResponse | null>(null);

  useEffect(() => {
    setPage(1);
    setFormOpen(false);
    setEditingSetting(null);
    setSchemaModule(null);
  }, [auth.activeOrganizationId]);

  const listParams = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      scope: scope === 'ALL' ? undefined : scope,
      module: module === 'ALL' ? undefined : module,
      activeOrganizationId: auth.activeOrganizationId
    }),
    [auth.activeOrganizationId, limit, module, page, scope, search]
  );

  const settingsQuery = useQuery({
    queryKey: settingsQueryKeys.list(listParams, auth.activeOrganizationId),
    queryFn: () =>
      sdk.settings.list({
        page,
        limit,
        search: search || undefined,
        scope: scope === 'ALL' ? undefined : scope,
        module: module === 'ALL' ? undefined : module
      })
  });

  const modulesQuery = useQuery({
    queryKey: settingsQueryKeys.modules,
    queryFn: () => sdk.modules.list({ page: 1, limit: 200 }),
    enabled: auth.hasPermission('modules.read')
  });

  const upsertMutation = useMutation({
    mutationFn: ({ key, values }: { key: string; values: SettingFormDialogSubmitValues }) =>
      sdk.settings.upsert(key, {
        scope: values.scope,
        module: values.scope === 'MODULE' ? values.module : undefined,
        organizationSpecific: values.scope === 'MODULE' ? values.organizationSpecific : undefined,
        value: values.value
      }),
    onSuccess: async () => {
      setFormOpen(false);
      setEditingSetting(null);
      await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.all });
    }
  });

  const modules = modulesQuery.isError ? [] : modulesQuery.data?.items ?? [];
  const modulesWithSchema = modules.filter((item) => Boolean(item.manifest?.settingsSchema));

  const pageError = settingsQuery.isError
    ? getApiErrorMessage(settingsQuery.error)
    : modulesQuery.isError
      ? getApiErrorMessage(modulesQuery.error)
      : null;

  const meta = settingsQuery.isError ? undefined : settingsQuery.data?.meta;
  const settings = settingsQuery.isError ? [] : settingsQuery.data?.items ?? [];

  if (auth.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-600">Manage global, organization and module settings.</p>
      </div>

      <SettingsToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        scope={scope}
        onScopeChange={(value) => {
          setScope(value);
          setPage(1);
        }}
        module={module}
        onModuleChange={(value) => {
          setModule(value);
          setPage(1);
        }}
        modules={modules}
        onCreate={() => {
          setEditingSetting(null);
          setFormOpen(true);
        }}
        onOpenSchema={() => {
          const next = module !== 'ALL' ? modules.find((item) => item.name === module) ?? null : modulesWithSchema[0] ?? null;
          setSchemaModule(next);
        }}
      />

      {pageError ? (
        <Alert className="border-red-200 bg-red-50 text-red-700">
          <AlertTitle>Failed to load settings</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      ) : null}

      <SettingsTable
        settings={settings}
        isLoading={settingsQuery.isLoading || modulesQuery.isLoading}
        onEdit={(setting) => {
          setEditingSetting(setting);
          setFormOpen(true);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4 text-sm">
        <div className="text-slate-600">
          Page {meta?.page ?? page} of {meta?.totalPages ?? 1} • Total: {meta?.total ?? 0}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((value) => value - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => value + 1)}
            disabled={page >= (meta?.totalPages ?? 1)}
          >
            Next
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-600">Rows per page</span>
          <Select
            value={String(limit)}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </Select>
        </div>
      </div>

      <SettingFormDialog
        open={formOpen}
        mode={editingSetting ? 'edit' : 'create'}
        setting={editingSetting}
        modules={modulesWithSchema}
        isSuperAdmin={isSuperAdmin}
        isSubmitting={upsertMutation.isPending}
        error={upsertMutation.isError ? getApiErrorMessage(upsertMutation.error) : null}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingSetting(null);
          }
        }}
        onSubmit={(values) => upsertMutation.mutate({ key: values.key, values })}
      />

      <ModuleSettingsSchemaDialog
        open={Boolean(schemaModule)}
        module={schemaModule}
        onOpenChange={(open) => {
          if (!open) {
            setSchemaModule(null);
          }
        }}
      />
    </div>
  );
}
