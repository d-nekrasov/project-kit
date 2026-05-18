export const ROUTE_PERMISSIONS = {
  '/': null,
  '/users': 'users.read',
  '/roles': 'roles.read',
  '/permissions': 'permissions.read',
  '/organizations': 'organizations.read',
  '/modules': 'modules.read',
  '/settings': 'settings.read',
  '/documents': 'documents.read',
  '/notification-settings': 'notifications.manage',
  '/audit-logs': 'auditLogs.read',
  '/system-logs': 'systemLogs.read'
} as const satisfies Record<string, string | null>;

export type RoutePermissionPath = keyof typeof ROUTE_PERMISSIONS;
