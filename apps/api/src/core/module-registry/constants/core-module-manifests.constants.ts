import { AppModuleManifest } from '../types/module-manifest.type';

export const CORE_MODULE_MANIFESTS: AppModuleManifest[] = [
  {
    name: 'core',
    title: 'Core',
    version: '0.1.0',
    description: 'Core platform functionality',
    permissions: [
      'users.read',
      'users.create',
      'users.update',
      'users.delete',
      'organizations.read',
      'organizations.create',
      'organizations.update',
      'organizations.delete',
      'roles.read',
      'roles.create',
      'roles.update',
      'roles.delete',
      'permissions.read',
      'settings.read',
      'settings.update',
      'auditLogs.read',
      'systemLogs.read',
      'modules.read',
      'modules.update',
      'installer.read',
      'notifications.read',
      'notifications.manage'
    ],
    adminMenu: [
      { label: 'Dashboard', path: '/', order: 1 },
      { label: 'Users', path: '/users', permission: 'users.read', order: 10 },
      { label: 'Organizations', path: '/organizations', permission: 'organizations.read', order: 20 },
      { label: 'Roles', path: '/roles', permission: 'roles.read', order: 30 },
      { label: 'Settings', path: '/settings', permission: 'settings.read', order: 40 },
      { label: 'Modules', path: '/modules', permission: 'modules.read', order: 50 },
      { label: 'Audit Logs', path: '/audit-logs', permission: 'auditLogs.read', order: 60 },
      { label: 'System Logs', path: '/system-logs', permission: 'systemLogs.read', order: 70 }
    ]
  }
];
