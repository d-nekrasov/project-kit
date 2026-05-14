import type { UserResponse, UserStatus } from '@project-kit/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { UserFormDialog } from '@/features/users/user-form-dialog';
import { UserStatusDialog } from '@/features/users/user-status-dialog';
import { usersQueryKeys } from '@/features/users/users-query-keys';
import type { UserFormValues, UserStatusFilter } from '@/features/users/users-page.types';
import { UsersTable } from '@/features/users/users-table';
import { UsersToolbar } from '@/features/users/users-toolbar';
import { useAuth } from '@/features/auth/use-auth';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { sdk } from '@/lib/sdk';

export function UsersPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatusFilter>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createOrganizationId, setCreateOrganizationId] = useState<string | null>(auth.activeOrganizationId);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [statusUser, setStatusUser] = useState<UserResponse | null>(null);

  useEffect(() => {
    setCreateDialogOpen(false);
    setCreateOrganizationId(auth.activeOrganizationId);
    setEditUser(null);
    setStatusUser(null);
  }, [auth.activeOrganizationId]);

  const usersQueryParams = useMemo(
    () => ({ page, limit, search: search || undefined, status: status === 'ALL' ? undefined : status, org: auth.activeOrganizationId }),
    [auth.activeOrganizationId, limit, page, search, status]
  );

  const usersQuery = useQuery({
    queryKey: usersQueryKeys.list(usersQueryParams),
    queryFn: () => sdk.users.list(usersQueryParams)
  });

  const rolesQuery = useQuery({
    queryKey: usersQueryKeys.roles(auth.activeOrganizationId),
    queryFn: () => sdk.roles.list({ page: 1, limit: 100 }),
    select: (response) => response.items.filter((role) => role.type === 'ORGANIZATION')
  });

  const isSuperAdmin = auth.hasSystemRole('super_admin');
  const organizationsQuery = useQuery({
    queryKey: ['organizations', 'active', 'users-form'],
    queryFn: () => sdk.organizations.list({ page: 1, limit: 100, status: 'ACTIVE' }),
    select: (response) => response.items,
    enabled: isSuperAdmin && createDialogOpen
  });

  const createRolesQuery = useQuery({
    queryKey: usersQueryKeys.roles(createOrganizationId),
    queryFn: () =>
      sdk.roles.list({
        page: 1,
        limit: 100,
        organizationId: createOrganizationId ?? undefined
      }),
    select: (response) => response.items.filter((role) => role.type === 'ORGANIZATION'),
    enabled: createDialogOpen && Boolean(createOrganizationId)
  });

  const createUserMutation = useMutation({
    mutationFn: (values: UserFormValues) =>
      sdk.users.create({
        email: values.email ?? '',
        name: values.name,
        password: values.password ?? '',
        roleId: values.roleId,
        organizationId: values.organizationId || undefined
      }),
    onSuccess: async () => {
      setCreateDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: usersQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['roles'] })
      ]);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (!editUser) {
        throw new Error('User is not selected');
      }

      return sdk.users.update(editUser.id, {
        name: values.name,
        roleId: values.roleId,
        organizationId: auth.activeOrganizationId ?? undefined
      });
    },
    onSuccess: async () => {
      setEditUser(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: usersQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['roles'] })
      ]);
    }
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: (nextStatus: UserStatus) => {
      if (!statusUser) {
        throw new Error('User is not selected');
      }

      return sdk.users.updateStatus(statusUser.id, { status: nextStatus });
    },
    onSuccess: async () => {
      setStatusUser(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: usersQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['roles'] })
      ]);
    }
  });

  const usersMeta = usersQuery.isError ? undefined : usersQuery.data?.meta;
  const users = usersQuery.isError ? [] : usersQuery.data?.items ?? [];

  const pageError = usersQuery.isError ? getApiErrorMessage(usersQuery.error) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Users</h2>
          <p className="text-sm text-slate-600">Manage organization users, roles and statuses.</p>
        </div>
        <Button type="button" onClick={() => setCreateDialogOpen(true)}>
          Create user
        </Button>
      </div>

      <UsersToolbar
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

      <UsersTable
        users={users}
        isLoading={usersQuery.isLoading}
        onEdit={(user) => setEditUser(user)}
        onChangeStatus={(user) => setStatusUser(user)}
        onViewDetails={(user) => navigate(`/users/${user.id}`)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4 text-sm">
        <div className="text-slate-600">
          Page {usersMeta?.page ?? page} of {usersMeta?.totalPages ?? 1} • Total: {usersMeta?.total ?? 0}
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
            disabled={page >= (usersMeta?.totalPages ?? 1)}
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

      <UserFormDialog
        open={createDialogOpen}
        mode="create"
        roles={createRolesQuery.data ?? rolesQuery.data ?? []}
        organizations={organizationsQuery.data ?? []}
        isSuperAdmin={isSuperAdmin}
        activeOrganizationId={createOrganizationId}
        onOrganizationChange={setCreateOrganizationId}
        isSubmitting={createUserMutation.isPending}
        errorMessage={createUserMutation.isError ? getApiErrorMessage(createUserMutation.error) : null}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (open) {
            setCreateOrganizationId(auth.activeOrganizationId);
          }
        }}
        onSubmit={(values) => createUserMutation.mutate(values)}
      />

      <UserFormDialog
        open={Boolean(editUser)}
        mode="edit"
        user={editUser}
        roles={rolesQuery.data ?? []}
        isSubmitting={updateUserMutation.isPending}
        errorMessage={updateUserMutation.isError ? getApiErrorMessage(updateUserMutation.error) : null}
        onOpenChange={(open) => {
          if (!open) {
            setEditUser(null);
          }
        }}
        onSubmit={(values) => updateUserMutation.mutate(values)}
      />

      <UserStatusDialog
        open={Boolean(statusUser)}
        user={statusUser}
        isSubmitting={updateUserStatusMutation.isPending}
        errorMessage={updateUserStatusMutation.isError ? getApiErrorMessage(updateUserStatusMutation.error) : null}
        onOpenChange={(open) => {
          if (!open) {
            setStatusUser(null);
          }
        }}
        onSubmit={(nextStatus) => updateUserStatusMutation.mutate(nextStatus)}
      />
    </div>
  );
}
