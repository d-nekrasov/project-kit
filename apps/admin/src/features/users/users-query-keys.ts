export const usersQueryKeys = {
  all: ['users'] as const,
  me: () => [...usersQueryKeys.all, 'me'] as const,
  details: () => [...usersQueryKeys.all, 'detail'] as const,
  detail: (id?: string) => [...usersQueryKeys.details(), id ?? 'none'] as const,
  lists: () => [...usersQueryKeys.all, 'list'] as const,
  list: (params: unknown) => [...usersQueryKeys.lists(), params] as const,
  roles: (organizationId?: string | null) => ['roles', 'organization', organizationId ?? 'none'] as const
};
