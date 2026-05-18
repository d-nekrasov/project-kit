import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/use-auth';
import { ROUTE_PERMISSIONS } from '@/lib/route-permissions';
import { sdk } from '@/lib/sdk';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

const coreMenu = [
  { label: 'Dashboard', path: '/', permission: ROUTE_PERMISSIONS['/'] },
  { label: 'Users', path: '/users', permission: ROUTE_PERMISSIONS['/users'] },
  { label: 'Organizations', path: '/organizations', permission: ROUTE_PERMISSIONS['/organizations'] },
  { label: 'Roles', path: '/roles', permission: ROUTE_PERMISSIONS['/roles'] },
  { label: 'Permissions', path: '/permissions', permission: ROUTE_PERMISSIONS['/permissions'] },
  { label: 'Settings', path: '/settings', permission: ROUTE_PERMISSIONS['/settings'] },
  { label: 'Modules', path: '/modules', permission: ROUTE_PERMISSIONS['/modules'] },
  { label: 'Audit Logs', path: '/audit-logs', permission: ROUTE_PERMISSIONS['/audit-logs'] },
  { label: 'System Logs', path: '/system-logs', permission: ROUTE_PERMISSIONS['/system-logs'] },
  { label: 'Documents', path: '/documents', permission: ROUTE_PERMISSIONS['/documents'] },
  { label: 'Notification Settings', path: '/notification-settings', permission: ROUTE_PERMISSIONS['/notification-settings'] }
];

export function AppSidebar() {
  const auth = useAuth();
  const location = useLocation();
  const modulesQuery = useQuery({
    queryKey: ['modules', 'enabled-menu'],
    queryFn: () => sdk.modules.list({ page: 1, limit: 100 }),
    enabled: auth.hasPermission('modules.read')
  });

  const moduleMenu = useMemo(() => {
    if (!modulesQuery.data) {
      return [];
    }

    return modulesQuery.data.items
      .filter((item) => item.status === 'ENABLED' && item.manifest?.adminMenu?.length)
      .flatMap((item) => item.manifest?.adminMenu ?? [])
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [modulesQuery.data]);

  const moduleMenuPaths = new Set(moduleMenu.map((item) => item.path));
  const navItems = [
    ...coreMenu,
    ...moduleMenu.filter((item) => !coreMenu.some((core) => core.path === item.path))
  ].filter((item) => !item.permission || auth.hasPermission(item.permission));

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Navigation</div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100',
                isActive && 'bg-slate-900 text-white hover:bg-slate-900'
              )}
            >
              <span>{item.label}</span>
              {moduleMenuPaths.has(item.path) ? <Badge>module</Badge> : null}
            </Link>
          );
        })}
      </nav>

      <Separator className="my-4" />
      <div className="text-xs text-slate-500">Admin shell foundation</div>
    </aside>
  );
}
