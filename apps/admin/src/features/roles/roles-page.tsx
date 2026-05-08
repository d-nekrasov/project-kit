import type { RoleResponse } from '@project-kit/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { RoleFormDialog } from '@/features/roles/role-form-dialog';
import { RolePermissionsDialog } from '@/features/roles/role-permissions-dialog';
import { rolesQueryKeys } from '@/features/roles/roles-query-keys';
import type { RoleFormValues } from '@/features/roles/roles-page.types';
import { RolesTable } from '@/features/roles/roles-table';
import { RolesToolbar } from '@/features/roles/roles-toolbar';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { sdk } from '@/lib/sdk';

export function RolesPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [includeSystem, setIncludeSystem] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleResponse | null>(null);
  const [permissionsRole, setPermissionsRole] = useState<RoleResponse | null>(null);

  useEffect(() => {
    setPage(1);
    setCreateDialogOpen(false);
    setEditRole(null);
    setPermissionsRole(null);
  }, [auth.activeOrganizationId]);

  const rolesQueryParams = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      includeSystem,
      org: auth.activeOrganizationId
    }),
    [auth.activeOrganizationId, includeSystem, limit, page, search]
  );

  const rolesQuery = useQuery({
    queryKey: rolesQueryKeys.list(rolesQueryParams, auth.activeOrganizationId),
    queryFn: () =>
      sdk.roles.list({
        page,
        limit,
        search: search || undefined,
        includeSystem
      })
  });

  const permissionsQuery = useQuery({
    queryKey: rolesQueryKeys.permissionsGrouped({ activeOrganizationId: auth.activeOrganizationId }, auth.activeOrganizationId),
    queryFn: () => sdk.permissions.grouped(),
    enabled: Boolean(permissionsRole)
  });

  const createRoleMutation = useMutation({
    mutationFn: (values: RoleFormValues) =>
      sdk.roles.create({
        code: values.code ?? '',
        name: values.name,
        permissions: []
      }),
    onSuccess: async () => {
      setCreateDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rolesQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['users'] })
      ]);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: (values: RoleFormValues) => {
      if (!editRole) {
        throw new Error('Role is not selected');
      }

      return sdk.roles.update(editRole.id, { name: values.name });
    },
    onSuccess: async () => {
      setEditRole(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rolesQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['users'] })
      ]);
    }
  });

  const updateRolePermissionsMutation = useMutation({
    mutationFn: (permissions: string[]) => {
      if (!permissionsRole) {
        throw new Error('Role is not selected');
      }

      return sdk.roles.updatePermissions(permissionsRole.id, { permissions });
    },
    onSuccess: async () => {
      setPermissionsRole(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rolesQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['permissions'] })
      ]);
    }
  });

  const rolesMeta = rolesQuery.data?.meta;
  const roles = rolesQuery.data?.items ?? [];
  const pageError = rolesQuery.isError ? getApiErrorMessage(rolesQuery.error) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Roles</h2>
          <p className="text-sm text-slate-600">Manage organization roles and permissions.</p>
        </div>
        <Button type="button" onClick={() => setCreateDialogOpen(true)}>
          Create role
        </Button>
      </div>

      <RolesToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        includeSystem={includeSystem}
        onIncludeSystemChange={(value) => {
          setIncludeSystem(value);
          setPage(1);
        }}
      />

      {pageError ? <ErrorState message={pageError} /> : null}

      <RolesTable
        roles={roles}
        isLoading={rolesQuery.isLoading}
        onEdit={(role) => {
          if (role.type === 'SYSTEM') {
            return;
          }
          setEditRole(role);
        }}
        onEditPermissions={(role) => {
          if (role.type === 'SYSTEM' || role.code === 'organization_admin') {
            return;
          }
          setPermissionsRole(role);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4 text-sm">
        <div className="text-slate-600">
          Page {rolesMeta?.page ?? page} of {rolesMeta?.totalPages ?? 1} • Total: {rolesMeta?.total ?? 0}
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
            disabled={page >= (rolesMeta?.totalPages ?? 1)}
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

      <RoleFormDialog
        open={createDialogOpen}
        mode="create"
        isSubmitting={createRoleMutation.isPending}
        errorMessage={createRoleMutation.isError ? getApiErrorMessage(createRoleMutation.error) : null}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(values) => createRoleMutation.mutate(values)}
      />

      <RoleFormDialog
        open={Boolean(editRole)}
        mode="edit"
        role={editRole}
        isSubmitting={updateRoleMutation.isPending}
        errorMessage={updateRoleMutation.isError ? getApiErrorMessage(updateRoleMutation.error) : null}
        onOpenChange={(open) => {
          if (!open) {
            setEditRole(null);
          }
        }}
        onSubmit={(values) => updateRoleMutation.mutate(values)}
      />

      <RolePermissionsDialog
        open={Boolean(permissionsRole)}
        role={permissionsRole}
        permissionGroups={permissionsQuery.data?.groups ?? []}
        isLoading={permissionsQuery.isLoading}
        isSubmitting={updateRolePermissionsMutation.isPending}
        errorMessage={
          updateRolePermissionsMutation.isError
            ? getApiErrorMessage(updateRolePermissionsMutation.error)
            : permissionsQuery.isError
              ? getApiErrorMessage(permissionsQuery.error)
              : null
        }
        onOpenChange={(open) => {
          if (!open) {
            setPermissionsRole(null);
          }
        }}
        onSubmit={(permissions) => updateRolePermissionsMutation.mutate(permissions)}
      />
    </div>
  );
}
