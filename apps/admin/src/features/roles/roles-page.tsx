import type { RoleResponse } from '@project-kit/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { EmptyState } from '@/components/common/empty-state';
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
import { useI18n } from '@/lib/i18n/use-i18n';
import { sdk } from '@/lib/sdk';

export function RolesPage() {
  const auth = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [includeSystem, setIncludeSystem] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleResponse | null>(null);
  const [permissionsRole, setPermissionsRole] = useState<RoleResponse | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(auth.activeOrganizationId);

  const isSuperAdmin = auth.user?.systemRoles.includes('super_admin') ?? false;

  useEffect(() => {
    setSelectedOrganizationId((current) => {
      if (!isSuperAdmin) {
        return auth.activeOrganizationId;
      }

      return current || auth.activeOrganizationId;
    });

    setPage(1);
    setCreateDialogOpen(false);
    setEditRole(null);
    setPermissionsRole(null);
  }, [auth.activeOrganizationId, isSuperAdmin]);

  const organizationsQuery = useQuery({
    queryKey: ['organizations', 'roles-selector'],
    queryFn: () => sdk.organizations.list({ page: 1, limit: 200, status: 'ACTIVE' }),
    select: (response) => response.items,
    enabled: isSuperAdmin
  });

  const organizations =
    organizationsQuery.data?.length
      ? organizationsQuery.data
      : (auth.user?.organizations.map((organization) => ({
          id: organization.id,
          name: organization.name,
          slug: organization.slug
        })) ?? []);
  const currentOrganizationName =
    auth.user?.organizations.find((organization) => organization.id === auth.activeOrganizationId)?.name ?? null;
  const selectedOrganizationName = useMemo(() => {
    if (!selectedOrganizationId) {
      return null;
    }

    const organization =
      organizations.find((item) => item.id === selectedOrganizationId) ??
      auth.user?.organizations.find((item) => item.id === selectedOrganizationId);
    return organization?.name ?? null;
  }, [auth.user?.organizations, organizations, selectedOrganizationId]);

  const rolesQueryParams = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      includeSystem,
      activeOrganizationId: auth.activeOrganizationId,
      selectedOrganizationId
    }),
    [auth.activeOrganizationId, includeSystem, limit, page, search, selectedOrganizationId]
  );

  const rolesQuery = useQuery({
    queryKey: rolesQueryKeys.list(rolesQueryParams, selectedOrganizationId ?? auth.activeOrganizationId),
    queryFn: () =>
      sdk.roles.list({
        page,
        limit,
        search: search || undefined,
        includeSystem,
        organizationId: isSuperAdmin ? selectedOrganizationId ?? undefined : undefined
      }),
    enabled: !isSuperAdmin || Boolean(selectedOrganizationId)
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
        permissions: [],
        organizationId: isSuperAdmin ? selectedOrganizationId ?? undefined : undefined
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

  const rolesMeta = rolesQuery.isError ? undefined : rolesQuery.data?.meta;
  const roles = rolesQuery.isError ? [] : rolesQuery.data?.items ?? [];
  const pageError = rolesQuery.isError ? getApiErrorMessage(rolesQuery.error) : null;
  const shouldSelectOrganization = isSuperAdmin && !selectedOrganizationId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Roles</h2>
          <p className="text-sm text-muted-foreground">Manage organization roles and permissions.</p>
        </div>
        <Button type="button" onClick={() => setCreateDialogOpen(true)} disabled={shouldSelectOrganization}>
          {t('common.createItem', { item: t('entities.role') })}
        </Button>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        Roles are scoped by organization. Select organization before editing role permissions.
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
        isSuperAdmin={isSuperAdmin}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        currentOrganizationName={currentOrganizationName}
        onSelectedOrganizationIdChange={(organizationId) => {
          setSelectedOrganizationId(organizationId || null);
          setPage(1);
          setCreateDialogOpen(false);
          setEditRole(null);
          setPermissionsRole(null);
        }}
        isOrganizationsLoading={organizationsQuery.isLoading}
        organizationsErrorMessage={organizationsQuery.isError ? getApiErrorMessage(organizationsQuery.error) : null}
      />

      {selectedOrganizationName ? (
        <div className="text-sm text-muted-foreground">Managing roles for: {selectedOrganizationName}</div>
      ) : null}

      {pageError ? <ErrorState message={pageError} /> : null}

      {shouldSelectOrganization ? (
        <EmptyState title="Select organization to manage roles" description="Roles are scoped to a single organization." />
      ) : (
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
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 text-sm">
        <div className="text-muted-foreground">
          Page {rolesMeta?.page ?? page} of {rolesMeta?.totalPages ?? 1} • Total: {rolesMeta?.total ?? 0}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((value) => value - 1)} disabled={page <= 1}>
            {t('common.previous')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => value + 1)}
            disabled={page >= (rolesMeta?.totalPages ?? 1)}
          >
            {t('common.next')}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('common.rowsPerPage')}</span>
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
        organizationName={selectedOrganizationName}
        isSubmitDisabled={shouldSelectOrganization}
        isSubmitting={createRoleMutation.isPending}
        errorMessage={createRoleMutation.isError ? getApiErrorMessage(createRoleMutation.error) : null}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(values) => createRoleMutation.mutate(values)}
      />

      <RoleFormDialog
        open={Boolean(editRole)}
        mode="edit"
        role={editRole}
        organizationName={selectedOrganizationName}
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
        organizationName={selectedOrganizationName}
        permissionGroups={permissionsQuery.isError ? [] : permissionsQuery.data?.groups ?? []}
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
