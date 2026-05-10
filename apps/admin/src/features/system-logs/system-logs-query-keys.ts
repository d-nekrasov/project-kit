export const systemLogsQueryKeys = {
  all: ['system-logs'] as const,
  lists: () => [...systemLogsQueryKeys.all, 'list'] as const,
  list: (params: unknown, activeOrganizationId?: string | null) =>
    [...systemLogsQueryKeys.lists(), activeOrganizationId ?? 'none', params] as const,
  detail: (id: string) => [...systemLogsQueryKeys.all, 'detail', id] as const
};
