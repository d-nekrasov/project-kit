export const modulesQueryKeys = {
  all: ['modules'] as const,
  lists: () => [...modulesQueryKeys.all, 'list'] as const,
  list: (params: unknown, organizationId?: string | null) =>
    [...modulesQueryKeys.lists(), organizationId ?? 'none', params] as const,
  detail: (name: string) => [...modulesQueryKeys.all, 'detail', name] as const
};
