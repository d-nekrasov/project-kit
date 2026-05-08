export const permissionsQueryKeys = {
  all: ['permissions'] as const,
  lists: (organizationId?: string | null) => [...permissionsQueryKeys.all, organizationId ?? 'none', 'list'] as const,
  list: (params: unknown, organizationId?: string | null) => [...permissionsQueryKeys.lists(organizationId), params] as const,
  grouped: (params: unknown, organizationId?: string | null) =>
    [...permissionsQueryKeys.all, organizationId ?? 'none', 'grouped', params] as const,
  modules: (organizationId?: string | null) => [...permissionsQueryKeys.all, organizationId ?? 'none', 'modules'] as const
};
