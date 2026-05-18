export const notificationsQueryKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationsQueryKeys.all, 'list'] as const,
  list: (params: unknown) => [...notificationsQueryKeys.lists(), params] as const,
  unreadCount: () => [...notificationsQueryKeys.all, 'unread-count'] as const
};
