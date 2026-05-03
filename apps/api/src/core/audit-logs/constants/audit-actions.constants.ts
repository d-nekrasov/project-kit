export const AUDIT_ACTIONS = {
  AUTH_LOGIN: 'auth.login',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_STATUS_UPDATE: 'user.status_update',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_PERMISSIONS_UPDATE: 'role.permissions_update',
  ORGANIZATION_CREATE: 'organization.create',
  ORGANIZATION_UPDATE: 'organization.update',
  ORGANIZATION_STATUS_UPDATE: 'organization.status_update',
  SETTING_UPDATE: 'setting.update',
  MODULE_STATUS_UPDATE: 'module.status_update'
} as const;

export const AUDIT_ENTITY_TYPES = {
  AUTH: 'auth',
  USER: 'user',
  ROLE: 'role',
  ORGANIZATION: 'organization',
  SETTING: 'setting',
  MODULE: 'module'
} as const;
