import { createBrowserRouter } from 'react-router-dom';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { RequirePermission } from '@/components/layout/require-permission';
import { AuditLogsPage } from '@/features/audit-logs/audit-logs-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { DocumentsPage } from '@/features/documents/documents-page';
import { InstallPage } from '@/features/installer/install-page';
import { ForgotPasswordPage } from '@/features/login/forgot-password-page';
import { LoginPage } from '@/features/login/login-page';
import { ResetPasswordPage } from '@/features/login/reset-password-page';
import { ModulesPage } from '@/features/modules/modules-page';
import { NotificationSettingsPage } from '@/features/notification-settings/notification-settings-page';
import { NotificationsPage } from '@/features/notifications/notifications-page';
import { OrganizationsPage } from '@/features/organizations/organizations-page';
import { PermissionsPage } from '@/features/permissions/permissions-page';
import { ProfilePage } from '@/features/profile/profile-page';
import { RolesPage } from '@/features/roles/roles-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { SystemLogsPage } from '@/features/system-logs/system-logs-page';
import { UserDetailPage } from '@/features/users/user-detail-page';
import { UsersPage } from '@/features/users/users-page';
import { ROUTE_PERMISSIONS } from '@/lib/route-permissions';

export const router = createBrowserRouter([
  {
    path: '/install',
    element: <InstallPage />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: 'users',
            element: (
              <RequirePermission permission={ROUTE_PERMISSIONS['/users']}>
                <UsersPage />
              </RequirePermission>
            )
          },
          {
            path: 'users/:id',
            element: (
              <RequirePermission permission={ROUTE_PERMISSIONS['/users']}>
                <UserDetailPage />
              </RequirePermission>
            )
          },
          {
            path: 'profile',
            element: <ProfilePage />
          },
          {
            path: 'notifications',
            element: <NotificationsPage />
          },
          {
            path: 'roles',
            element: (
              <RequirePermission permission={ROUTE_PERMISSIONS['/roles']}>
                <RolesPage />
              </RequirePermission>
            )
          },
          {
            path: 'permissions',
            element: (
              <RequirePermission permission={ROUTE_PERMISSIONS['/permissions']}>
                <PermissionsPage />
              </RequirePermission>
            )
          },
          {
            path: 'organizations',
            element: (
              <RequirePermission permission={ROUTE_PERMISSIONS['/organizations']}>
                <OrganizationsPage />
              </RequirePermission>
            )
          },
          {
            path: 'modules',
            element: (
              <RequirePermission permission={ROUTE_PERMISSIONS['/modules']}>
                <ModulesPage />
              </RequirePermission>
            )
          },
          {
            path: 'settings',
            element: (
              <RequirePermission permission={ROUTE_PERMISSIONS['/settings']}>
                <SettingsPage />
              </RequirePermission>
            )
          },
          {
            path: 'audit-logs',
            element: (
              <RequirePermission permission={ROUTE_PERMISSIONS['/audit-logs']}>
                <AuditLogsPage />
              </RequirePermission>
            )
          },
          {
            path: 'system-logs',
            element: (
              <RequirePermission permission={ROUTE_PERMISSIONS['/system-logs']}>
                <SystemLogsPage />
              </RequirePermission>
            )
          },
          {
            path: 'documents',
            element: (
              <RequirePermission permission={ROUTE_PERMISSIONS['/documents']}>
                <DocumentsPage />
              </RequirePermission>
            )
          },
          {
            path: 'notification-settings',
            element: (
              <RequirePermission permission={ROUTE_PERMISSIONS['/notification-settings']}>
                <NotificationSettingsPage />
              </RequirePermission>
            )
          }
        ]
      }
    ]
  }
]);
