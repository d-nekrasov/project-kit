import type { ModuleRegistryResponse, ModuleStatus } from '@project-kit/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { ModuleManifestDialog } from '@/features/modules/module-manifest-dialog';
import { ModuleStatusDialog } from '@/features/modules/module-status-dialog';
import { modulesQueryKeys } from '@/features/modules/modules-query-keys';
import type { ModuleStatusFilter } from '@/features/modules/modules-page.types';
import { ModulesTable } from '@/features/modules/modules-table';
import { ModulesToolbar } from '@/features/modules/modules-toolbar';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { sdk } from '@/lib/sdk';

export function ModulesPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { user } = auth;
  const isSuperAdmin = user?.systemRoles.includes('super_admin') ?? false;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ModuleStatusFilter>('ALL');
  const [manifestModule, setManifestModule] = useState<ModuleRegistryResponse | null>(null);
  const [statusModule, setStatusModule] = useState<ModuleRegistryResponse | null>(null);

  useEffect(() => {
    setPage(1);
    setManifestModule(null);
    setStatusModule(null);
  }, [auth.activeOrganizationId]);

  const modulesQueryParams = useMemo(
    () => ({
      page,
      limit,
      search,
      status,
      activeOrganizationId: auth.activeOrganizationId
    }),
    [auth.activeOrganizationId, limit, page, search, status]
  );

  const modulesQuery = useQuery({
    queryKey: modulesQueryKeys.list(modulesQueryParams, auth.activeOrganizationId),
    queryFn: () =>
      sdk.modules.list({
        page,
        limit,
        search: search || undefined,
        status: status === 'ALL' ? undefined : status
      })
  });

  const moduleDetailQuery = useQuery({
    queryKey: modulesQueryKeys.detail(manifestModule?.name ?? ''),
    queryFn: () => sdk.modules.getByName(manifestModule?.name ?? ''),
    enabled: Boolean(manifestModule?.name)
  });

  const updateModuleStatusMutation = useMutation({
    mutationFn: (nextStatus: ModuleStatus) => {
      if (!statusModule) {
        throw new Error('Module is not selected');
      }

      return sdk.modules.updateStatus(statusModule.name, { status: nextStatus });
    },
    onSuccess: async () => {
      setStatusModule(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: modulesQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['roles'] })
      ]);
    }
  });

  const modulesMeta = modulesQuery.data?.meta;
  const modules = modulesQuery.data?.items ?? [];
  const pageError = modulesQuery.isError ? getApiErrorMessage(modulesQuery.error) : null;

  const manifestDialogModule = moduleDetailQuery.data ?? manifestModule;

  if (auth.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Modules</h2>
        <p className="text-sm text-slate-600">Connected platform and business modules.</p>
      </div>

      <ModulesToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />

      {pageError ? <ErrorState message={pageError} /> : null}

      {!modulesQuery.isLoading && !modules.length && !pageError ? (
        <EmptyState title="No modules found" description="Try changing search or status filters." />
      ) : (
        <ModulesTable
          modules={modules}
          isLoading={modulesQuery.isLoading}
          isSuperAdmin={isSuperAdmin}
          onViewManifest={(module) => setManifestModule(module)}
          onChangeStatus={(module) => {
            if (module.name === 'core') {
              return;
            }
            setStatusModule(module);
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4 text-sm">
        <div className="text-slate-600">
          Page {modulesMeta?.page ?? page} of {modulesMeta?.totalPages ?? 1} • Total: {modulesMeta?.total ?? 0}
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
            disabled={page >= (modulesMeta?.totalPages ?? 1)}
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
          </Select>
        </div>
      </div>

      <ModuleManifestDialog
        open={Boolean(manifestModule)}
        module={manifestDialogModule}
        onOpenChange={(open) => {
          if (!open) {
            setManifestModule(null);
          }
        }}
      />

      <ModuleStatusDialog
        open={Boolean(statusModule)}
        module={statusModule}
        isSubmitting={updateModuleStatusMutation.isPending}
        error={updateModuleStatusMutation.isError ? getApiErrorMessage(updateModuleStatusMutation.error) : null}
        onOpenChange={(open) => {
          if (!open) {
            setStatusModule(null);
          }
        }}
        onSubmit={(nextStatus) => updateModuleStatusMutation.mutate(nextStatus)}
      />
    </div>
  );
}
