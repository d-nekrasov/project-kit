import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { sdk } from '@/lib/sdk';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

const coreMenu = [
  { label: 'Dashboard', path: '/' },
  { label: 'Users', path: '/users' },
  { label: 'Organizations', path: '/organizations' },
  { label: 'Roles', path: '/roles' },
  { label: 'Permissions', path: '/permissions' },
  { label: 'Settings', path: '/settings' },
  { label: 'Modules', path: '/modules' },
  { label: 'Audit Logs', path: '/audit-logs' },
  { label: 'System Logs', path: '/system-logs' },
  { label: 'Documents', path: '/documents' }
];

export function AppSidebar() {
  const location = useLocation();
  const modulesQuery = useQuery({
    queryKey: ['modules', 'enabled-menu'],
    queryFn: () => sdk.modules.list({ page: 1, limit: 100 })
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
  const navItems = [...coreMenu, ...moduleMenu.filter((item) => !coreMenu.some((core) => core.path === item.path))];

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
