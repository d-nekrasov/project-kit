import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/components/layout/app-layout';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { InstallPage } from '@/features/installer/install-page';
import { LoginPage } from '@/features/login/login-page';
import { ModulesPage } from '@/features/modules/modules-page';
import { OrganizationsPage } from '@/features/organizations/organizations-page';
import { PermissionsPage } from '@/features/permissions/permissions-page';
import { PlaceholderPage } from '@/features/placeholders/placeholder-page';
import { RolesPage } from '@/features/roles/roles-page';
import { UsersPage } from '@/features/users/users-page';

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
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'permissions', element: <PermissionsPage /> },
          { path: 'organizations', element: <OrganizationsPage /> },
          { path: 'modules', element: <ModulesPage /> },
          { path: 'settings', element: <PlaceholderPage title="Settings" /> },
          { path: 'audit-logs', element: <PlaceholderPage title="Audit Logs" /> },
          { path: 'system-logs', element: <PlaceholderPage title="System Logs" /> },
          { path: 'documents', element: <PlaceholderPage title="Documents" /> }
        ]
      }
    ]
  }
]);
