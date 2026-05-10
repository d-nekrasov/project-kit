import type { SystemLogResponse } from '@project-kit/sdk';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { SystemLogDetailDialog } from '@/features/system-logs/system-log-detail-dialog';
import { systemLogsQueryKeys } from '@/features/system-logs/system-logs-query-keys';
import { SystemLogsTable } from '@/features/system-logs/system-logs-table';
import { SystemLogsToolbar } from '@/features/system-logs/system-logs-toolbar';
import { type SystemLogLevelFilter, toSystemLogLevel } from '@/features/system-logs/system-logs-page.types';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { sdk } from '@/lib/sdk';

function toDateRangeFrom(value: string) {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function toDateRangeTo(value: string) {
  return value ? `${value}T23:59:59.999Z` : undefined;
}

export function SystemLogsPage() {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<SystemLogLevelFilter>('ALL');
  const [source, setSource] = useState('');
  const [userId, setUserId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<SystemLogResponse | null>(null);

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
      level,
      source,
      userId,
      organizationId,
      dateFrom,
      dateTo,
      activeOrganizationId: auth.activeOrganizationId
    }),
    [auth.activeOrganizationId, dateFrom, dateTo, level, limit, organizationId, page, search, source, userId]
  );

  const systemLogsQuery = useQuery({
    queryKey: systemLogsQueryKeys.list(listParams, auth.activeOrganizationId),
    queryFn: () =>
      sdk.systemLogs.list({
        page,
        limit,
        search: search || undefined,
        level: toSystemLogLevel(level),
        source: source || undefined,
        userId: userId || undefined,
        organizationId: organizationId || undefined,
        dateFrom: toDateRangeFrom(dateFrom),
        dateTo: toDateRangeTo(dateTo)
      })
  });

  const detailQuery = useQuery({
    queryKey: systemLogsQueryKeys.detail(selectedLogId ?? ''),
    queryFn: () => sdk.systemLogs.getById(selectedLogId ?? ''),
    enabled: Boolean(selectedLogId)
  });

  const logs = systemLogsQuery.data?.items ?? [];
  const meta = systemLogsQuery.data?.meta;
  const pageError = systemLogsQuery.isError ? getApiErrorMessage(systemLogsQuery.error) : null;
  const detailError = detailQuery.isError ? getApiErrorMessage(detailQuery.error) : null;
  const detailLog = detailQuery.data ?? selectedLog;
  const detailOpen = Boolean(selectedLogId);

  if (auth.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">System Logs</h2>
        <p className="text-sm text-slate-600">Technical and runtime events from the platform.</p>
      </div>

      <SystemLogsToolbar
        search={search}
        level={level}
        source={source}
        userId={userId}
        organizationId={organizationId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onLevelChange={(value) => {
          setLevel(value);
          setPage(1);
        }}
        onSourceChange={(value) => {
          setSource(value);
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
          setLevel('ALL');
          setSource('');
          setUserId('');
          setOrganizationId('');
          setDateFrom('');
          setDateTo('');
          setPage(1);
        }}
      />

      {pageError ? <ErrorState message={pageError} /> : null}

      <SystemLogsTable
        logs={logs}
        isLoading={systemLogsQuery.isLoading}
        onViewDetails={(log) => {
          setSelectedLog(log);
          setSelectedLogId(log.id);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4 text-sm">
        <div className="text-slate-600">
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

      <SystemLogDetailDialog
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
