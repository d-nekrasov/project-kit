import type { RoleResponse, UserOrganization, UserResponse, UserStatus } from '@project-kit/sdk';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AlertCircle, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { useI18n } from '@/lib/i18n/use-i18n';
import { sdk } from '@/lib/sdk';

type MembershipRow = {
  organizationId: string;
  roleId: string;
  status: UserStatus;
};

type UserOrganizationsDialogProps = {
  open: boolean;
  user: UserResponse | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rows: MembershipRow[]) => void;
  onRemove: (organizationId: string) => void;
};

function toRows(organizations: UserOrganization[]): MembershipRow[] {
  return organizations.map((organization) => ({
    organizationId: organization.id,
    roleId: organization.roleId,
    status: organization.membershipStatus
  }));
}

export function UserOrganizationsDialog({
  open,
  user,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
  onRemove
}: UserOrganizationsDialogProps) {
  const auth = useAuth();
  const { t } = useI18n();
  const isSuperAdmin = auth.hasSystemRole('super_admin');
  const [rows, setRows] = useState<MembershipRow[]>([]);
  const [newOrganizationId, setNewOrganizationId] = useState('');

  useEffect(() => {
    if (open && user) {
      const initialRows = toRows(user.organizations);
      setRows(
        isSuperAdmin
          ? initialRows
          : initialRows.filter((row) => row.organizationId === auth.activeOrganizationId)
      );
      setNewOrganizationId('');
    }
  }, [auth.activeOrganizationId, isSuperAdmin, open, user]);

  const organizationsQuery = useQuery({
    queryKey: ['organizations', 'active', 'user-memberships'],
    queryFn: () => sdk.organizations.list({ page: 1, limit: 100, status: 'ACTIVE' }),
    select: (response) => response.items,
    enabled: open && isSuperAdmin
  });

  const roleQueries = useQueries({
    queries: rows.map((row) => ({
      queryKey: ['roles', 'organization', row.organizationId],
      queryFn: () => sdk.roles.list({ page: 1, limit: 100, organizationId: row.organizationId }),
      select: (response: { items: RoleResponse[] }) =>
        response.items.filter((role) => role.type === 'ORGANIZATION')
    }))
  });

  const rolesByOrganizationId = useMemo(() => {
    const result = new Map<string, RoleResponse[]>();
    rows.forEach((row, index) => {
      result.set(row.organizationId, roleQueries[index]?.data ?? []);
    });
    return result;
  }, [roleQueries, rows]);

  const existingOrganizationIds = new Set(rows.map((row) => row.organizationId));
  const availableOrganizations = (organizationsQuery.data ?? []).filter(
    (organization) => !existingOrganizationIds.has(organization.id)
  );

  if (!user) {
    return null;
  }

  function updateRow(organizationId: string, patch: Partial<MembershipRow>) {
    setRows((currentRows) =>
      currentRows.map((row) => (row.organizationId === organizationId ? { ...row, ...patch } : row))
    );
  }

  function addMembership() {
    if (!newOrganizationId) {
      return;
    }
    setRows((currentRows) => [
      ...currentRows,
      {
        organizationId: newOrganizationId,
        roleId: '',
        status: 'ACTIVE'
      }
    ]);
    setNewOrganizationId('');
  }

  function removeMembership(row: MembershipRow) {
    if (!user) {
      return;
    }

    const existingMembership = user.organizations.find((organization) => organization.id === row.organizationId);
    if (!existingMembership) {
      setRows((currentRows) =>
        currentRows.filter((currentRow) => currentRow.organizationId !== row.organizationId)
      );
      return;
    }

    const organizationName = existingMembership.name;
    if (
      window.confirm(
        t('users.organizationsDialog.confirmRemove', { email: user.email, organization: organizationName })
      )
    ) {
      onRemove(row.organizationId);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('users.organizationsDialog.title')}</DialogTitle>
          <DialogDescription>{t('users.organizationsDialog.description', { email: user.email })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errorMessage ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertTitle>{t('common.requestFailed')}</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-3">
            {rows.map((row) => {
              const organization = user.organizations.find((item) => item.id === row.organizationId);
              const listedOrganization = organizationsQuery.data?.find((item) => item.id === row.organizationId);
              const roles = rolesByOrganizationId.get(row.organizationId) ?? [];
              const activeRowsAfterRemove = rows.filter(
                (item) => item.organizationId !== row.organizationId && item.status === 'ACTIVE'
              ).length;
              const isCurrentUserActiveOrganization =
                user.id === auth.user?.id && row.organizationId === auth.activeOrganizationId;
              const removeDisabled =
                isSubmitting ||
                isCurrentUserActiveOrganization ||
                (user.status === 'ACTIVE' && row.status === 'ACTIVE' && activeRowsAfterRemove === 0);
              return (
                <div key={row.organizationId} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_150px_auto]">
                  <div>
                    <Label>{t('common.organization')}</Label>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {organization?.name ?? listedOrganization?.name ?? row.organizationId}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`role-${row.organizationId}`}>{t('common.role')}</Label>
                    <Select
                      id={`role-${row.organizationId}`}
                      value={row.roleId}
                      onChange={(event) => updateRow(row.organizationId, { roleId: event.target.value })}
                    >
                      <option value="">{t('users.organizationsDialog.selectRole')}</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`status-${row.organizationId}`}>{t('common.status')}</Label>
                    <Select
                      id={`status-${row.organizationId}`}
                      value={row.status}
                      onChange={(event) =>
                        updateRow(row.organizationId, { status: event.target.value as UserStatus })
                      }
                    >
                      <option value="ACTIVE">{t('users.status.active')}</option>
                      <option value="INACTIVE">{t('users.status.inactive')}</option>
                      <option value="BLOCKED">{t('users.status.blocked')}</option>
                    </Select>
                  </div>
                  {isSuperAdmin ? (
                    <div className="flex items-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateRow(row.organizationId, { status: 'INACTIVE' })}
                        disabled={isSubmitting}
                      >
                        {t('users.organizationsDialog.markInactive')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeMembership(row)}
                        disabled={removeDisabled}
                        title={
                          isCurrentUserActiveOrganization
                            ? t('users.organizationsDialog.cannotRemoveSelf')
                            : removeDisabled
                              ? t('users.organizationsDialog.mustKeepOneActive')
                              : t('users.organizationsDialog.removeMembership')
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t('users.organizationsDialog.removeMembershipTitle')}</span>
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {isSuperAdmin ? (
            <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/40 p-3">
              <div className="min-w-64 flex-1">
                <Label htmlFor="add-organization">{t('users.organizationsDialog.addOrganization')}</Label>
                <Select
                  id="add-organization"
                  value={newOrganizationId}
                  onChange={(event) => setNewOrganizationId(event.target.value)}
                >
                  <option value="">{t('users.organizationsDialog.selectOrganization')}</option>
                  {availableOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={addMembership} disabled={!newOrganizationId}>
                {t('users.organizationsDialog.addMembership')}
              </Button>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => onSubmit(rows)} disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
