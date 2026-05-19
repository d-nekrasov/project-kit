import { Link } from 'react-router-dom';

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
import { useAdminNavigation } from '@/components/layout/use-admin-navigation';

export function AppSidebar() {
  const { state } = useSidebar();
  const navItems = useAdminNavigation();
  const appName = import.meta.env.VITE_APP_NAME || 'Project Kit';

  return (
    <Sidebar collapsible="icon" className="hidden md:flex">
      <SidebarHeader className="border-b border-slate-200">
        {state === 'expanded' ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{appName}</div>
            <div className="text-xs text-slate-500">Admin Console</div>
          </div>
        ) : (
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
            {appName.slice(0, 1).toUpperCase()}
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.isActive}
                      tooltip={item.label}
                      className={item.badge ? 'pr-20' : undefined}
                    >
                      <Link to={item.path}>
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge ? (
                      <SidebarMenuBadge>
                        <Badge className="bg-slate-200 text-slate-700">{item.badge}</Badge>
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
            <Separator className="mb-3" />
            <div className="rounded-lg border bg-slate-50 p-3 text-xs text-slate-600">
              <div className="font-medium text-slate-900">System status</div>
              <div className="mt-1">Secure admin workspace</div>
            </div>
          </>
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
