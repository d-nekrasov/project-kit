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
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/use-auth';
import type { AuthContextValue } from '@/features/auth/auth-context';
import { ROUTE_PERMISSIONS } from '@/lib/route-permissions';
import { sdk } from '@/lib/sdk';

type AdminNavigationItem = {
  label: string;
  path: string;
  permission?: string | null;
  icon: LucideIcon;
  badge?: string;
  isActive: boolean;
};

export type AdminNavigationGroup = {
  label: string;
  badge?: string;
  items: AdminNavigationItem[];
};

type AdminNavigationItemConfig = Omit<AdminNavigationItem, 'isActive'> & {
  moduleName?: string;
  order?: number;
};

type AdminNavigationGroupConfig = {
  label: string;
  items: AdminNavigationItemConfig[];
};

const coreNavigationGroups = [
  {
    label: 'Обзор',
    items: [{ label: 'Dashboard', path: '/', permission: ROUTE_PERMISSIONS['/'], icon: Gauge }]
  },
  {
    label: 'Управление',
    items: [
      { label: 'Users', path: '/users', permission: ROUTE_PERMISSIONS['/users'], icon: Users },
      {
        label: 'Organizations',
        path: '/organizations',
        permission: ROUTE_PERMISSIONS['/organizations'],
        icon: Building2
      }
    ]
  },
  {
    label: 'Безопасность',
    items: [
      { label: 'Roles', path: '/roles', permission: ROUTE_PERMISSIONS['/roles'], icon: ShieldCheck },
      { label: 'Permissions', path: '/permissions', permission: ROUTE_PERMISSIONS['/permissions'], icon: KeyRound },
      { label: 'Audit Logs', path: '/audit-logs', permission: ROUTE_PERMISSIONS['/audit-logs'], icon: ListChecks }
    ]
  },
  {
    label: 'Система',
    items: [
      { label: 'Settings', path: '/settings', permission: ROUTE_PERMISSIONS['/settings'], icon: Settings },
      { label: 'System Logs', path: '/system-logs', permission: ROUTE_PERMISSIONS['/system-logs'], icon: ScrollText },
      {
        label: 'Notification Settings',
        path: '/notification-settings',
        permission: ROUTE_PERMISSIONS['/notification-settings'],
        icon: Bell
      }
    ]
  },
  {
    label: 'Модули',
    items: [
      { label: 'Modules', path: '/modules', permission: ROUTE_PERMISSIONS['/modules'], icon: Boxes },
      { label: 'Documents', path: '/documents', permission: ROUTE_PERMISSIONS['/documents'], icon: FileText }
    ]
  }
] as const satisfies AdminNavigationGroupConfig[];

const coreMenuPaths = new Set<string>(coreNavigationGroups.flatMap((group) => group.items.map((item) => item.path)));
const coreModuleMenuPaths = new Set<string>([
  '/',
  '/users',
  '/organizations',
  '/roles',
  '/permissions',
  '/settings',
  '/modules',
  '/audit-logs',
  '/system-logs'
]);
const coreModuleMenuGroupByPath = new Map<string, string>(
  coreNavigationGroups.flatMap((group) =>
    group.items.filter((item) => coreModuleMenuPaths.has(item.path)).map((item) => [item.path, group.label] as const)
  )
);

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

function toNavigationItem(item: AdminNavigationItemConfig, pathname: string): AdminNavigationItem {
  return {
    label: item.label,
    path: item.path,
    permission: item.permission,
    icon: item.icon,
    badge: item.moduleName && item.moduleName !== 'core' ? item.moduleName : item.badge,
    isActive: isRouteActive(pathname, item.path)
  };
}

function filterAllowedItems(items: AdminNavigationItemConfig[], auth: AuthContextValue) {
  return items.filter((item) => !item.permission || auth.hasPermission(item.permission));
}

function buildCoreGroups(pathname: string, auth: AuthContextValue): AdminNavigationGroup[] {
  return coreNavigationGroups.map((group) => ({
    label: group.label,
    items: filterAllowedItems([...group.items], auth).map((item) => toNavigationItem(item, pathname))
  }));
}

function appendModuleItems(
  groups: AdminNavigationGroup[],
  moduleItems: AdminNavigationItemConfig[],
  pathname: string,
  auth: AuthContextValue
) {
  const groupsByLabel = new Map(groups.map((group) => [group.label, group]));
  const moduleGroup = groupsByLabel.get('Модули');

  if (!moduleGroup) {
    return groups;
  }

  let appendedModuleItems = 0;

  for (const item of filterAllowedItems(moduleItems, auth)) {
    const targetGroupLabel = coreModuleMenuGroupByPath.get(item.path);
    const targetGroup: AdminNavigationGroup | undefined = targetGroupLabel
      ? groupsByLabel.get(targetGroupLabel)
      : moduleGroup;

    if (!targetGroup || targetGroup.items.some((currentItem) => currentItem.path === item.path)) {
      continue;
    }

    targetGroup.items.push(toNavigationItem(item, pathname));
    if (targetGroup === moduleGroup) {
      appendedModuleItems += 1;
    }
  }

  moduleGroup.badge = appendedModuleItems > 0 ? String(appendedModuleItems) : undefined;

  return groups;
}

export function useAdminNavigation(): AdminNavigationGroup[] {
  const auth = useAuth();
  const location = useLocation();
  const modulesQuery = useQuery({
    queryKey: ['modules', 'enabled-menu'],
    queryFn: () => sdk.modules.list({ page: 1, limit: 100 }),
    enabled: auth.hasPermission('modules.read')
  });

  const moduleMenu = useMemo<AdminNavigationItemConfig[]>(() => {
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
      .filter((item) => !coreMenuPaths.has(item.path) || coreModuleMenuPaths.has(item.path))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [modulesQuery.data]);

  return useMemo(
    () => appendModuleItems(buildCoreGroups(location.pathname, auth), moduleMenu, location.pathname, auth).filter((group) => group.items.length > 0),
    [auth, location.pathname, moduleMenu]
  );
}
