export const notificationSettingsQueryKeys = {
  all: ['notification-settings'] as const,
  connectors: () => [...notificationSettingsQueryKeys.all, 'connectors'] as const,
  templates: (params?: unknown) => [...notificationSettingsQueryKeys.all, 'templates', params ?? {}] as const
};
