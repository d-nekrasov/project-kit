export const usersQueryKeys = {
  all: ['users'] as const,
  lists: () => [...usersQueryKeys.all, 'list'] as const,
  list: (params: unknown) => [...usersQueryKeys.lists(), params] as const,
  roles: (organizationId?: string | null) => ['roles', 'organization', organizationId ?? 'none'] as const
};
