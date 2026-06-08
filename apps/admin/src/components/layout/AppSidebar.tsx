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
import { useI18n } from '@/lib/i18n/use-i18n';

export function AppSidebar() {
  const { state } = useSidebar();
  const navigationGroups = useAdminNavigation();
  const appName = import.meta.env.VITE_APP_NAME || 'Project Kit';
  const { t } = useI18n();

  return (
    <Sidebar collapsible="icon" className="hidden md:flex">
      <SidebarHeader className="border-b border-border">
        {state === 'expanded' ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{appName}</div>
            <div className="text-xs text-muted-foreground">{t('layout.adminConsole')}</div>
          </div>
        ) : (
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
            {appName.slice(0, 1).toUpperCase()}
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="space-y-3">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="flex items-center justify-between gap-2">
              <span>{group.label}</span>
              {group.badge ? (
                <Badge className="bg-slate-100 px-1.5 text-[10px] font-medium text-muted-foreground">{group.badge}</Badge>
              ) : null}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={item.isActive}
                        tooltip={item.label}
                        className={item.badge ? 'pr-24' : undefined}
                      >
                        <Link to={item.path}>
                          <Icon className="size-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge ? (
                        <SidebarMenuBadge>
                          <Badge className="max-w-20 truncate bg-slate-100 text-muted-foreground">{item.badge}</Badge>
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {state === 'expanded' ? (
          <>
            <Separator className="mb-3" />
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">{t('layout.systemStatus')}</div>
              <div className="mt-1">{t('layout.secureWorkspace')}</div>
            </div>
          </>
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
