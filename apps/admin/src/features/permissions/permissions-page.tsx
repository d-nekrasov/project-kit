import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { PermissionsGroupedView } from '@/features/permissions/permissions-grouped-view';
import type { PermissionsViewMode } from '@/features/permissions/permissions-page.types';
import { permissionsQueryKeys } from '@/features/permissions/permissions-query-keys';
import { PermissionsTable } from '@/features/permissions/permissions-table';
import { PermissionsToolbar } from '@/features/permissions/permissions-toolbar';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { sdk } from '@/lib/sdk';

export function PermissionsPage() {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('ALL');
  const [viewMode, setViewMode] = useState<PermissionsViewMode>('grouped');

  useEffect(() => {
    setPage(1);
  }, [auth.activeOrganizationId]);

  const tableParams = useMemo(
    () => ({
      page,
      limit,
      search,
      module,
      activeOrganizationId: auth.activeOrganizationId
    }),
    [auth.activeOrganizationId, limit, module, page, search]
  );

  const groupedParams = useMemo(
    () => ({
      search,
      module,
      activeOrganizationId: auth.activeOrganizationId
    }),
    [auth.activeOrganizationId, module, search]
  );

  const modulesQuery = useQuery({
    queryKey: permissionsQueryKeys.modules(auth.activeOrganizationId),
    queryFn: () => sdk.permissions.modules()
  });

  const permissionsQuery = useQuery({
    queryKey: permissionsQueryKeys.list(tableParams, auth.activeOrganizationId),
    queryFn: () =>
      sdk.permissions.list({
        page,
        limit,
        search: search || undefined,
        module: module === 'ALL' ? undefined : module
      }),
    enabled: viewMode === 'table'
  });

  const groupedQuery = useQuery({
    queryKey: permissionsQueryKeys.grouped(groupedParams, auth.activeOrganizationId),
    queryFn: () =>
      sdk.permissions.grouped({
        search: search || undefined,
        module: module === 'ALL' ? undefined : module
      }),
    enabled: viewMode === 'grouped'
  });

  const pageError =
    modulesQuery.isError
      ? getApiErrorMessage(modulesQuery.error)
      : viewMode === 'table'
        ? permissionsQuery.isError
          ? getApiErrorMessage(permissionsQuery.error)
          : null
        : groupedQuery.isError
          ? getApiErrorMessage(groupedQuery.error)
          : null;

  const permissionsMeta = permissionsQuery.isError ? undefined : permissionsQuery.data?.meta;
  const modules = modulesQuery.isError ? [] : modulesQuery.data?.items ?? [];
  const permissions = permissionsQuery.isError ? [] : permissionsQuery.data?.items ?? [];
  const permissionGroups = groupedQuery.isError ? [] : groupedQuery.data?.groups ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">Permissions</h2>
        <p className="text-sm text-slate-600">Read-only registry of permissions registered by core and modules.</p>
        <p className="text-xs text-slate-500">Permissions are managed by platform core and module manifests. Admin UI cannot create or edit them.</p>
      </div>

      <PermissionsToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        module={module}
        onModuleChange={(value) => {
          setModule(value);
          setPage(1);
        }}
        modules={modules}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isModulesLoading={modulesQuery.isLoading}
      />

      {pageError ? <ErrorState message={pageError} /> : null}

      {viewMode === 'table' ? (
        <PermissionsTable permissions={permissions} isLoading={permissionsQuery.isLoading} />
      ) : (
        <PermissionsGroupedView groups={permissionGroups} isLoading={groupedQuery.isLoading} />
      )}

      {viewMode === 'table' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4 text-sm">
          <div className="text-slate-600">
            Page {permissionsMeta?.page ?? page} of {permissionsMeta?.totalPages ?? 1} • Total: {permissionsMeta?.total ?? 0}
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
              disabled={page >= (permissionsMeta?.totalPages ?? 1)}
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
      ) : null}
    </div>
  );
}
