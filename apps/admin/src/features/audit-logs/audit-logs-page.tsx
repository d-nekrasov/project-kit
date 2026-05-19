import type { AuditLogResponse } from '@project-kit/sdk';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { LoadingScreen } from '@/components/common/loading-screen';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { AuditLogDetailDialog } from '@/features/audit-logs/audit-log-detail-dialog';
import { auditLogsQueryKeys } from '@/features/audit-logs/audit-logs-query-keys';
import { AuditLogsTable } from '@/features/audit-logs/audit-logs-table';
import { AuditLogsToolbar } from '@/features/audit-logs/audit-logs-toolbar';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { sdk } from '@/lib/sdk';

function toDateRangeFrom(value: string) {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function toDateRangeTo(value: string) {
  return value ? `${value}T23:59:59.999Z` : undefined;
}

export function AuditLogsPage() {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [userId, setUserId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null);

  useEffect(() => {
    setPage(1);
    setSelectedLogId(null);
    setSelectedLog(null);
  }, [auth.activeOrganizationId]);

  const listParams = useMemo(
    () => ({
      page,
      limit,
      search,
      action,
      entityType,
      entityId,
      userId,
      organizationId,
      dateFrom,
      dateTo,
      activeOrganizationId: auth.activeOrganizationId
    }),
    [action, auth.activeOrganizationId, dateFrom, dateTo, entityId, entityType, limit, organizationId, page, search, userId]
  );

  const auditLogsQuery = useQuery({
    queryKey: auditLogsQueryKeys.list(listParams, auth.activeOrganizationId),
    queryFn: () =>
      sdk.auditLogs.list({
        page,
        limit,
        search: search || undefined,
        action: action || undefined,
        entityType: entityType || undefined,
        entityId: entityId || undefined,
        userId: userId || undefined,
        organizationId: organizationId || undefined,
        dateFrom: toDateRangeFrom(dateFrom),
        dateTo: toDateRangeTo(dateTo)
      })
  });

  const detailQuery = useQuery({
    queryKey: auditLogsQueryKeys.detail(selectedLogId ?? ''),
    queryFn: () => sdk.auditLogs.getById(selectedLogId ?? ''),
    enabled: Boolean(selectedLogId)
  });

  const logs = auditLogsQuery.isError ? [] : auditLogsQuery.data?.items ?? [];
  const meta = auditLogsQuery.isError ? undefined : auditLogsQuery.data?.meta;
  const pageError = auditLogsQuery.isError ? getApiErrorMessage(auditLogsQuery.error) : null;
  const detailError = detailQuery.isError ? getApiErrorMessage(detailQuery.error) : null;
  const detailLog = detailQuery.isError ? null : detailQuery.data ?? selectedLog;
  const detailOpen = Boolean(selectedLogId);

  if (auth.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Audit Logs</h2>
        <p className="text-sm text-muted-foreground">User actions and security-relevant events.</p>
      </div>

      <AuditLogsToolbar
        search={search}
        action={action}
        entityType={entityType}
        entityId={entityId}
        userId={userId}
        organizationId={organizationId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onActionChange={(value) => {
          setAction(value);
          setPage(1);
        }}
        onEntityTypeChange={(value) => {
          setEntityType(value);
          setPage(1);
        }}
        onEntityIdChange={(value) => {
          setEntityId(value);
          setPage(1);
        }}
        onUserIdChange={(value) => {
          setUserId(value);
          setPage(1);
        }}
        onOrganizationIdChange={(value) => {
          setOrganizationId(value);
          setPage(1);
        }}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setPage(1);
        }}
        onDateToChange={(value) => {
          setDateTo(value);
          setPage(1);
        }}
        onReset={() => {
          setSearch('');
          setAction('');
          setEntityType('');
          setEntityId('');
          setUserId('');
          setOrganizationId('');
          setDateFrom('');
          setDateTo('');
          setPage(1);
        }}
      />

      {pageError ? (
        <Alert className="border-red-200 bg-red-50">
          <AlertTitle className="text-red-700">Failed to load audit logs</AlertTitle>
          <AlertDescription className="text-red-700">{pageError}</AlertDescription>
        </Alert>
      ) : null}

      <AuditLogsTable
        logs={logs}
        isLoading={auditLogsQuery.isLoading}
        onViewDetails={(log) => {
          setSelectedLog(log);
          setSelectedLogId(log.id);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 text-sm">
        <div className="text-muted-foreground">
          Page {meta?.page ?? page} of {meta?.totalPages ?? 1} • Total: {meta?.total ?? 0}
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
            disabled={page >= (meta?.totalPages ?? 1)}
          >
            Next
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page</span>
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

      <AuditLogDetailDialog
        open={detailOpen}
        log={detailLog}
        isLoading={detailQuery.isLoading}
        error={detailError}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLogId(null);
            setSelectedLog(null);
          }
        }}
      />
    </div>
  );
}
