import type { OrganizationResponse, OrganizationStatus } from '@project-kit/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CrudPageHeader, CrudPagination, CrudToolbarCard } from '@/components/common/crud-layout';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { OrganizationFormDialog } from '@/features/organizations/organization-form-dialog';
import { OrganizationsTable } from '@/features/organizations/organizations-table';
import { organizationsQueryKeys } from '@/features/organizations/organizations-query-keys';
import { OrganizationsToolbar } from '@/features/organizations/organizations-toolbar';
import { OrganizationStatusDialog } from '@/features/organizations/organization-status-dialog';
import type {
  OrganizationFormValues,
  OrganizationStatusFilter
} from '@/features/organizations/organizations-page.types';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { sdk } from '@/lib/sdk';

export function OrganizationsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { user } = auth;
  const isSuperAdmin = user?.systemRoles.includes('super_admin') ?? false;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrganizationStatusFilter>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editOrganization, setEditOrganization] = useState<OrganizationResponse | null>(null);
  const [statusOrganization, setStatusOrganization] = useState<OrganizationResponse | null>(null);

  useEffect(() => {
    setPage(1);
    setCreateDialogOpen(false);
    setEditOrganization(null);
    setStatusOrganization(null);
  }, [auth.activeOrganizationId]);

  const organizationsQueryParams = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      status: status === 'ALL' ? undefined : status,
      activeOrganizationId: auth.activeOrganizationId
    }),
    [auth.activeOrganizationId, limit, page, search, status]
  );

  const organizationsQuery = useQuery({
    queryKey: organizationsQueryKeys.list(organizationsQueryParams, auth.activeOrganizationId),
    queryFn: () =>
      sdk.organizations.list({
        page,
        limit,
        search: search || undefined,
        status: status === 'ALL' ? undefined : status
      })
  });

  const createOrganizationMutation = useMutation({
    mutationFn: (values: OrganizationFormValues) => sdk.organizations.create({ name: values.name, slug: values.slug }),
    onSuccess: async () => {
      setCreateDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['modules'] })
      ]);
    }
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: (values: OrganizationFormValues) => {
      if (!editOrganization) {
        throw new Error('Organization is not selected');
      }

      return sdk.organizations.update(editOrganization.id, { name: values.name, slug: values.slug });
    },
    onSuccess: async () => {
      setEditOrganization(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['modules'] })
      ]);
    }
  });

  const updateOrganizationStatusMutation = useMutation({
    mutationFn: (nextStatus: OrganizationStatus) => {
      if (!statusOrganization) {
        throw new Error('Organization is not selected');
      }

      return sdk.organizations.updateStatus(statusOrganization.id, { status: nextStatus });
    },
    onSuccess: async () => {
      setStatusOrganization(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['modules'] })
      ]);
      await auth.refreshMe();
    }
  });

  const organizationsMeta = organizationsQuery.isError ? undefined : organizationsQuery.data?.meta;
  const organizations = organizationsQuery.isError ? [] : organizationsQuery.data?.items ?? [];
  const pageError = organizationsQuery.isError ? getApiErrorMessage(organizationsQuery.error) : null;

  return (
    <div className="space-y-6">
      <CrudPageHeader
        title="Organizations"
        description="Manage organizations, their statuses and core counters."
        action={
          isSuperAdmin ? (
            <Button type="button" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create organization
            </Button>
          ) : null
        }
      />

      <CrudToolbarCard>
        <OrganizationsToolbar
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
      </CrudToolbarCard>

      {pageError ? <ErrorState message={pageError} /> : null}

      {!organizationsQuery.isLoading && !organizations.length && !pageError ? (
        <EmptyState title="No organizations found" description="Try changing search or status filters." />
      ) : (
        <OrganizationsTable
          organizations={organizations}
          isLoading={organizationsQuery.isLoading}
          isSuperAdmin={isSuperAdmin}
          activeOrganizationId={auth.activeOrganizationId}
          onEdit={(organization) => setEditOrganization(organization)}
          onChangeStatus={(organization) => setStatusOrganization(organization)}
        />
      )}

      <CrudPagination
        page={organizationsMeta?.page ?? page}
        totalPages={organizationsMeta?.totalPages ?? 1}
        total={organizationsMeta?.total ?? 0}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
      />

      <OrganizationFormDialog
        open={createDialogOpen}
        mode="create"
        isSubmitting={createOrganizationMutation.isPending}
        error={createOrganizationMutation.isError ? getApiErrorMessage(createOrganizationMutation.error) : null}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(values) => createOrganizationMutation.mutate(values)}
      />

      <OrganizationFormDialog
        open={Boolean(editOrganization)}
        mode="edit"
        organization={editOrganization}
        isSubmitting={updateOrganizationMutation.isPending}
        error={updateOrganizationMutation.isError ? getApiErrorMessage(updateOrganizationMutation.error) : null}
        onOpenChange={(open) => {
          if (!open) {
            setEditOrganization(null);
          }
        }}
        onSubmit={(values) => updateOrganizationMutation.mutate(values)}
      />

      <OrganizationStatusDialog
        open={Boolean(statusOrganization)}
        organization={statusOrganization}
        isSubmitting={updateOrganizationStatusMutation.isPending}
        error={
          updateOrganizationStatusMutation.isError
            ? getApiErrorMessage(updateOrganizationStatusMutation.error)
            : null
        }
        onOpenChange={(open) => {
          if (!open) {
            setStatusOrganization(null);
          }
        }}
        onSubmit={(nextStatus) => updateOrganizationStatusMutation.mutate(nextStatus)}
      />
    </div>
  );
}
