import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/components/layout/app-layout';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { InstallPage } from '@/features/installer/install-page';
import { LoginPage } from '@/features/login/login-page';
import { PlaceholderPage } from '@/features/placeholders/placeholder-page';

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
          { path: 'users', element: <PlaceholderPage title="Users" /> },
          { path: 'roles', element: <PlaceholderPage title="Roles" /> },
          { path: 'permissions', element: <PlaceholderPage title="Permissions" /> },
          { path: 'organizations', element: <PlaceholderPage title="Organizations" /> },
          { path: 'settings', element: <PlaceholderPage title="Settings" /> },
          { path: 'modules', element: <PlaceholderPage title="Modules" /> },
          { path: 'audit-logs', element: <PlaceholderPage title="Audit Logs" /> },
          { path: 'system-logs', element: <PlaceholderPage title="System Logs" /> },
          { path: 'documents', element: <PlaceholderPage title="Documents" /> }
        ]
      }
    ]
  }
]);
