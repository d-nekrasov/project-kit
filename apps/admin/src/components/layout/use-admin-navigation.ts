import { useMemo } from 'react';
import {
  Bell,
  Boxes,
  Building2,
  FileText,
  Gauge,
  KeyRound,
  ListChecks,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { ROUTE_PERMISSIONS } from '@/lib/route-permissions';
import { sdk } from '@/lib/sdk';
import { useQuery } from '@tanstack/react-query';

type AdminNavigationItem = {
  label: string;
  path: string;
  permission?: string | null;
  icon: LucideIcon;
  badge?: string;
  isActive: boolean;
};

const coreMenu = [
  { label: 'Dashboard', path: '/', permission: ROUTE_PERMISSIONS['/'], icon: Gauge },
  { label: 'Users', path: '/users', permission: ROUTE_PERMISSIONS['/users'], icon: Users },
  { label: 'Organizations', path: '/organizations', permission: ROUTE_PERMISSIONS['/organizations'], icon: Building2 },
  { label: 'Roles', path: '/roles', permission: ROUTE_PERMISSIONS['/roles'], icon: ShieldCheck },
  { label: 'Permissions', path: '/permissions', permission: ROUTE_PERMISSIONS['/permissions'], icon: KeyRound },
  { label: 'Settings', path: '/settings', permission: ROUTE_PERMISSIONS['/settings'], icon: Settings },
  { label: 'Modules', path: '/modules', permission: ROUTE_PERMISSIONS['/modules'], icon: Boxes },
  { label: 'Audit Logs', path: '/audit-logs', permission: ROUTE_PERMISSIONS['/audit-logs'], icon: ListChecks },
  { label: 'System Logs', path: '/system-logs', permission: ROUTE_PERMISSIONS['/system-logs'], icon: ScrollText },
  { label: 'Documents', path: '/documents', permission: ROUTE_PERMISSIONS['/documents'], icon: FileText },
  { label: 'Notification Settings', path: '/notification-settings', permission: ROUTE_PERMISSIONS['/notification-settings'], icon: Bell }
];

function resolveModuleIcon(icon?: string): LucideIcon {
  if (icon === 'file-text') {
    return FileText;
  }

  return Boxes;
}

function isRouteActive(pathname: string, path: string) {
  if (path === '/') {
    return pathname === '/';
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

export function useAdminNavigation(): AdminNavigationItem[] {
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
      .flatMap((item) =>
        (item.manifest?.adminMenu ?? []).map((menuItem) => ({
          label: menuItem.label,
          path: menuItem.path,
          permission: menuItem.permission,
          moduleName: item.name,
          order: menuItem.order,
          icon: resolveModuleIcon(menuItem.icon)
        }))
      )
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [modulesQuery.data]);

  const coreMenuPaths = new Set(coreMenu.map((item) => item.path));

  return [...coreMenu, ...moduleMenu.filter((item) => !coreMenuPaths.has(item.path))]
    .filter((item) => !item.permission || auth.hasPermission(item.permission))
    .map((item) => ({
      label: item.label,
      path: item.path,
      permission: item.permission,
      icon: item.icon,
      badge: 'moduleName' in item && item.moduleName !== 'core' ? 'module' : undefined,
      isActive: isRouteActive(location.pathname, item.path)
    }));
}
