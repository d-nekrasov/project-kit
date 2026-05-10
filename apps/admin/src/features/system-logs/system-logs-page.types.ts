import type { SystemLogLevel, SystemLogResponse } from '@project-kit/sdk';

export const SYSTEM_LOG_LEVEL_OPTIONS = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const;

export type SystemLogLevelFilter = (typeof SYSTEM_LOG_LEVEL_OPTIONS)[number];

export type SystemLogsToolbarProps = {
  search: string;
  level: SystemLogLevelFilter;
  source: string;
  userId: string;
  organizationId: string;
  dateFrom: string;
  dateTo: string;
  onSearchChange: (value: string) => void;
  onLevelChange: (value: SystemLogLevelFilter) => void;
  onSourceChange: (value: string) => void;
  onUserIdChange: (value: string) => void;
  onOrganizationIdChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onReset: () => void;
};

export type SystemLogsTableProps = {
  logs: SystemLogResponse[];
  isLoading?: boolean;
  onViewDetails: (log: SystemLogResponse) => void;
};

export type SystemLogDetailDialogProps = {
  open: boolean;
  log: SystemLogResponse | null;
  isLoading?: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
};

export const SYSTEM_LOG_SOURCES = [
  'auth',
  'installer',
  'casbin',
  'audit_logs',
  'system_logs',
  'database',
  'module_registry',
  'settings',
  'users',
  'roles',
  'organizations'
] as const;

export function toSystemLogLevel(level: SystemLogLevelFilter): SystemLogLevel | undefined {
  return level === 'ALL' ? undefined : level;
}
