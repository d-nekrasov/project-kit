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
  Users
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import { useAuth } from '@/features/auth/use-auth';
import { ROUTE_PERMISSIONS } from '@/lib/route-permissions';
import { sdk } from '@/lib/sdk';
import { useQuery } from '@tanstack/react-query';

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

export function AppSidebar() {
  const auth = useAuth();
  const location = useLocation();
  const { state } = useSidebar();
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
          ...menuItem,
          moduleName: item.name,
          icon: menuItem.icon === 'file-text' ? FileText : Boxes
        }))
      )
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [modulesQuery.data]);

  const coreMenuPaths = new Set(coreMenu.map((item) => item.path));
  const moduleMenuPaths = new Set(moduleMenu.filter((item) => item.moduleName !== 'core').map((item) => item.path));
  const navItems = [
    ...coreMenu,
    ...moduleMenu.filter((item) => !coreMenuPaths.has(item.path))
  ].filter((item) => !item.permission || auth.hasPermission(item.permission));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={moduleMenuPaths.has(item.path) ? 'pr-20' : undefined}
                    >
                      <Link to={item.path}>
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {moduleMenuPaths.has(item.path) ? (
                      <SidebarMenuBadge>
                        <Badge>module</Badge>
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {state === 'expanded' ? (
          <>
            <Separator className="mb-4" />
            <div className="text-xs text-slate-500">Admin shell foundation</div>
          </>
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
