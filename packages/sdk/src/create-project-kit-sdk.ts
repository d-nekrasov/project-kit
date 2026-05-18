import { ApiClient } from './client/api-client';
import type { ApiClientOptions } from './client/api-client.types';
import { AuditLogsApi } from './resources/audit-logs.api';
import { AuthApi } from './resources/auth.api';
import { DocumentsApi } from './resources/documents.api';
import { InstallerApi } from './resources/installer.api';
import { NotificationConnectorsApi } from './resources/notification-connectors.api';
import { NotificationTemplatesApi } from './resources/notification-templates.api';
import { NotificationsApi } from './resources/notifications.api';
import { ModulesApi } from './resources/modules.api';
import { OrganizationsApi } from './resources/organizations.api';
import { PermissionsApi } from './resources/permissions.api';
import { RolesApi } from './resources/roles.api';
import { SettingsApi } from './resources/settings.api';
import { SystemLogsApi } from './resources/system-logs.api';
import { UsersApi } from './resources/users.api';

export function createProjectKitSdk(options: ApiClientOptions) {
  const client = new ApiClient(options);

  return {
    client,
    installer: new InstallerApi(client),
    auth: new AuthApi(client),
    users: new UsersApi(client),
    roles: new RolesApi(client),
    permissions: new PermissionsApi(client),
    organizations: new OrganizationsApi(client),
    settings: new SettingsApi(client),
    modules: new ModulesApi(client),
    auditLogs: new AuditLogsApi(client),
    systemLogs: new SystemLogsApi(client),
    documents: new DocumentsApi(client),
    notifications: new NotificationsApi(client),
    notificationConnectors: new NotificationConnectorsApi(client),
    notificationTemplates: new NotificationTemplatesApi(client)
  };
}
