import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAdminNavigation } from '@/components/layout/use-admin-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/lib/i18n/use-i18n';
import { cn } from '@/lib/utils';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const navigationGroups = useAdminNavigation();
  const appName = import.meta.env.VITE_APP_NAME || 'Project Kit';
  const { t } = useI18n();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-9 px-0 md:hidden"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>
      <SheetContent className="fixed inset-y-0 left-0 z-[var(--z-sheet)] flex w-80 max-w-[85vw] flex-col border-r bg-card p-0 shadow-xl md:hidden">
        <div className="flex min-h-16 items-center px-5">
          <div>
            <div className="text-sm font-semibold">{appName}</div>
            <div className="text-xs text-muted-foreground">{t('layout.adminConsole')}</div>
          </div>
        </div>
        <Separator />
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-5">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                <div className="mb-2 flex items-center justify-between gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>{group.label}</span>
                  {group.badge ? (
                    <Badge className="bg-slate-100 px-1.5 text-[10px] font-medium text-muted-foreground">{group.badge}</Badge>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground/80 transition hover:bg-muted hover:text-foreground',
                          item.isActive && 'bg-slate-100 font-medium text-foreground'
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge ? (
                          <Badge className="max-w-24 truncate bg-slate-100 text-muted-foreground">{item.badge}</Badge>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
