import type { UserStatus } from '@project-kit/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/error-state';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Button } from '@/components/ui/button';
import { UserDetailCard } from '@/features/users/user-detail-card';
import { UserFormDialog } from '@/features/users/user-form-dialog';
import { UserOrganizationsCard } from '@/features/users/user-organizations-card';
import { UserOrganizationsDialog } from '@/features/users/user-organizations-dialog';
import { UserStatusDialog } from '@/features/users/user-status-dialog';
import { usersQueryKeys } from '@/features/users/users-query-keys';
import type { UserFormValues } from '@/features/users/users-page.types';
import { useAuth } from '@/features/auth/use-auth';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useI18n } from '@/lib/i18n/use-i18n';
import { sdk } from '@/lib/sdk';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [organizationsOpen, setOrganizationsOpen] = useState(false);

  const userQuery = useQuery({
    queryKey: usersQueryKeys.detail(id),
    queryFn: () => sdk.users.getById(id ?? ''),
    enabled: Boolean(id)
  });

  const rolesQuery = useQuery({
    queryKey: usersQueryKeys.roles(auth.activeOrganizationId),
    queryFn: () => sdk.roles.list({ page: 1, limit: 100 }),
    select: (response) => response.items.filter((role) => role.type === 'ORGANIZATION')
  });

  const updateUserMutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (!id) {
        throw new Error('User is not selected');
      }

      return sdk.users.update(id, {
        name: values.name,
        roleId: values.roleId,
        organizationId: auth.activeOrganizationId ?? undefined
      });
    },
    onSuccess: async () => {
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: usersQueryKeys.all });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: (nextStatus: UserStatus) => {
      if (!id) {
        throw new Error('User is not selected');
      }
      return sdk.users.updateStatus(id, { status: nextStatus });
    },
    onSuccess: async () => {
      setStatusOpen(false);
      await queryClient.invalidateQueries({ queryKey: usersQueryKeys.all });
    }
  });

  const updateOrganizationsMutation = useMutation({
    mutationFn: (organizations: Array<{ organizationId: string; roleId: string; status?: UserStatus }>) => {
      if (!id) {
        throw new Error('User is not selected');
      }
      return sdk.users.updateOrganizations(id, { organizations });
    },
    onSuccess: async (updatedUser) => {
      setOrganizationsOpen(false);
      if (auth.user?.id === updatedUser.id) {
        queryClient.clear();
        await auth.refreshMe();
        return;
      }

      await queryClient.invalidateQueries({ queryKey: usersQueryKeys.all });
    }
  });

  const removeOrganizationMutation = useMutation({
    mutationFn: (organizationId: string) => {
      if (!id) {
        throw new Error('User is not selected');
      }
      return sdk.users.removeOrganization(id, organizationId);
    },
    onSuccess: async (updatedUser) => {
      if (auth.user?.id === updatedUser.id) {
        queryClient.clear();
        await auth.refreshMe();
        return;
      }

      await queryClient.invalidateQueries({ queryKey: usersQueryKeys.all });
    }
  });

  if (userQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (userQuery.isError || !userQuery.data) {
    return <ErrorState message={userQuery.isError ? getApiErrorMessage(userQuery.error) : t('users.detail.notFound')} />;
  }

  const user = userQuery.data;
  const canUpdate = auth.hasPermission('users.update');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Button type="button" variant="ghost" className="mb-2 px-0" onClick={() => navigate('/users')}>
            {t('users.detail.backToUsers')}
          </Button>
          <h2 className="text-2xl font-semibold text-foreground">{user.name || user.email}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        {canUpdate ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
              {t('users.detail.editUser')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStatusOpen(true)}>
              {t('users.detail.changeStatus')}
            </Button>
          </div>
        ) : null}
      </div>

      <UserDetailCard user={user} />
      <UserOrganizationsCard user={user} canManage={canUpdate} onManage={() => setOrganizationsOpen(true)} />

      <UserFormDialog
        open={editOpen}
        mode="edit"
        user={user}
        roles={rolesQuery.data ?? []}
        activeOrganizationId={auth.activeOrganizationId}
        isSubmitting={updateUserMutation.isPending}
        errorMessage={updateUserMutation.isError ? getApiErrorMessage(updateUserMutation.error) : null}
        onOpenChange={setEditOpen}
        onSubmit={(values) => updateUserMutation.mutate(values)}
      />

      <UserStatusDialog
        open={statusOpen}
        user={user}
        isSubmitting={updateStatusMutation.isPending}
        errorMessage={updateStatusMutation.isError ? getApiErrorMessage(updateStatusMutation.error) : null}
        onOpenChange={setStatusOpen}
        onSubmit={(nextStatus) => updateStatusMutation.mutate(nextStatus)}
      />

      <UserOrganizationsDialog
        open={organizationsOpen}
        user={user}
        isSubmitting={updateOrganizationsMutation.isPending || removeOrganizationMutation.isPending}
        errorMessage={
          updateOrganizationsMutation.isError
            ? getApiErrorMessage(updateOrganizationsMutation.error)
            : removeOrganizationMutation.isError
              ? getApiErrorMessage(removeOrganizationMutation.error)
              : null
        }
        onOpenChange={setOrganizationsOpen}
        onSubmit={(rows) => updateOrganizationsMutation.mutate(rows)}
        onRemove={(organizationId) => removeOrganizationMutation.mutate(organizationId)}
      />
    </div>
  );
}
