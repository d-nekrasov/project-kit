import type { AuditLogResponse } from '@project-kit/sdk';

export const AUDIT_ACTION_OPTIONS = [
  '',
  'auth.login',
  'user.create',
  'user.update',
  'user.status_update',
  'role.create',
  'role.update',
  'role.permissions_update',
  'organization.create',
  'organization.update',
  'organization.status_update',
  'setting.update',
  'module.status_update',
  'document.create',
  'document.update',
  'document.status_update'
] as const;

export const AUDIT_ENTITY_TYPE_OPTIONS = ['', 'auth', 'user', 'role', 'organization', 'setting', 'module', 'document'] as const;

export type AuditLogsToolbarProps = {
  search: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  organizationId: string;
  dateFrom: string;
  dateTo: string;
  onSearchChange: (value: string) => void;
  onActionChange: (value: string) => void;
  onEntityTypeChange: (value: string) => void;
  onEntityIdChange: (value: string) => void;
  onUserIdChange: (value: string) => void;
  onOrganizationIdChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onReset: () => void;
};

export type AuditLogsTableProps = {
  logs: AuditLogResponse[];
  isLoading?: boolean;
  onViewDetails: (log: AuditLogResponse) => void;
};

export type AuditLogDetailDialogProps = {
  open: boolean;
  log: AuditLogResponse | null;
  isLoading?: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
};

