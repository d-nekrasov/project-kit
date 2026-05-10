export const documentsQueryKeys = {
  all: ['documents'] as const,
  lists: () => [...documentsQueryKeys.all, 'list'] as const,
  list: (params: unknown, organizationId?: string | null) =>
    [...documentsQueryKeys.lists(), organizationId ?? 'none', params] as const,
  detail: (id: string) => [...documentsQueryKeys.all, 'detail', id] as const
};
