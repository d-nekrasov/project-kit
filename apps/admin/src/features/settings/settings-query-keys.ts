export const settingsQueryKeys = {
  all: ['settings'] as const,
  lists: () => [...settingsQueryKeys.all, 'list'] as const,
  list: (params: unknown, organizationId?: string | null) => [...settingsQueryKeys.lists(), organizationId ?? 'none', params] as const,
  modules: ['modules', 'settings-schema'] as const
};
