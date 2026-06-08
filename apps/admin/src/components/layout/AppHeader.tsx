import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { OrganizationSwitcher } from '@/components/layout/organization-switcher';
import { UserMenu } from '@/components/layout/UserMenu';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { useI18n } from '@/lib/i18n/use-i18n';

export function AppHeader() {
  const appName = import.meta.env.VITE_APP_NAME || 'Project Kit';
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-[var(--z-header)] flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileSidebar />
        <SidebarTrigger className="hidden md:inline-flex" />
        <Separator className="mx-1 hidden h-6 w-px md:block" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold sm:text-base">{appName}</div>
          <div className="hidden text-xs text-muted-foreground sm:block">{t('layout.adminWorkspace')}</div>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <div className="hidden sm:block">
          <OrganizationSwitcher />
        </div>
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
