export const auditLogsQueryKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogsQueryKeys.all, 'list'] as const,
  list: (params: unknown, organizationId?: string | null) =>
    [...auditLogsQueryKeys.lists(), organizationId ?? 'none', params] as const,
  detail: (id: string) => [...auditLogsQueryKeys.all, 'detail', id] as const
};

