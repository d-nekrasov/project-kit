export const organizationsQueryKeys = {
  all: ['organizations'] as const,
  lists: (organizationId?: string | null) => [...organizationsQueryKeys.all, organizationId ?? 'none', 'list'] as const,
  list: (params: unknown, organizationId?: string | null) => [...organizationsQueryKeys.lists(organizationId), params] as const,
  detail: (id: string) => [...organizationsQueryKeys.all, 'detail', id] as const
};
