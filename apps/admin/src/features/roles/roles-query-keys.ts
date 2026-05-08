export const rolesQueryKeys = {
  all: ['roles'] as const,
  lists: (organizationId?: string | null) => [...rolesQueryKeys.all, organizationId ?? 'none', 'list'] as const,
  list: (params: unknown, organizationId?: string | null) => [...rolesQueryKeys.lists(organizationId), params] as const,
  detail: (id: string, organizationId?: string | null) => [...rolesQueryKeys.all, organizationId ?? 'none', 'detail', id] as const,
  permissionsGrouped: (params?: unknown, organizationId?: string | null) =>
    ['permissions', organizationId ?? 'none', 'grouped', params ?? {}] as const
};
