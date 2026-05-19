import { PanelLeft } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  state: 'expanded' | 'collapsed';
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function mergeChildClassName(child: React.ReactElement, className: string) {
  return cn((child.props as { className?: string }).className, className);
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

type SidebarProviderProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SidebarProvider({
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className,
  children,
  ...props
}: SidebarProviderProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);

      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextOpen);
      }
    },
    [controlledOpen, onOpenChange]
  );

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      open,
      setOpen,
      toggleSidebar: () => setOpen(!open),
      state: open ? 'expanded' : 'collapsed'
    }),
    [open, setOpen]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        className={cn('group/sidebar-wrapper flex min-h-screen w-full items-start', className)}
        data-state={value.state}
        style={
          {
            '--sidebar-width': '16rem',
            '--sidebar-width-icon': '4rem',
            ...props.style
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

type SidebarProps = React.HTMLAttributes<HTMLElement> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
};

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, children, side = 'left', variant = 'sidebar', collapsible = 'none', ...props }, ref) => {
    const { state } = useSidebar();
    const collapsed = collapsible === 'icon' && state === 'collapsed';

    return (
      <aside
        ref={ref}
        className={cn(
          'group/sidebar sticky top-0 flex h-screen min-h-screen shrink-0 self-start flex-col border-border bg-card text-foreground transition-[width] duration-200 ease-linear',
          side === 'left' ? 'border-r' : 'order-2 border-l',
          variant === 'floating' && 'm-2 min-h-[calc(100vh-1rem)] rounded-lg border shadow-sm',
          variant === 'inset' && 'm-2 min-h-[calc(100vh-1rem)] rounded-lg border',
          collapsed ? 'w-[var(--sidebar-width-icon)]' : 'w-[var(--sidebar-width)]',
          className
        )}
        data-side={side}
        data-variant={variant}
        data-collapsible={collapsed ? 'icon' : ''}
        data-state={state}
        {...props}
      >
        {children}
      </aside>
    );
  }
);
Sidebar.displayName = 'Sidebar';

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { state } = useSidebar();

  return (
    <div
      className={cn('flex min-h-14 items-center px-4 pb-2 pt-4', state === 'collapsed' && 'justify-center px-2', className)}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { state } = useSidebar();

  return <div className={cn('min-h-0 flex-1 overflow-auto px-4 py-2', state === 'collapsed' && 'px-2', className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { state } = useSidebar();

  return <div className={cn('mt-auto p-4 pt-2', state === 'collapsed' && 'px-2', className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-2', className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { state } = useSidebar();

  if (state === 'collapsed') {
    return null;
  }

  return <div className={cn('text-xs font-semibold uppercase tracking-wider text-muted-foreground', className)} {...props} />;
}

export function SidebarGroupContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-1', className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn('space-y-1', className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={cn('relative list-none', className)} {...props} />;
}

type SidebarMenuButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string;
};

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ asChild, isActive, tooltip, className, children, ...props }, ref) => {
    const { state } = useSidebar();
    const collapsed = state === 'collapsed';
    const buttonClassName = cn(
      'flex min-h-9 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground',
      collapsed ? 'justify-center px-2 [&>span]:hidden' : 'justify-start',
      isActive && 'bg-accent font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground',
      className
    );

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        className: mergeChildClassName(children, buttonClassName),
        'data-active': isActive ? 'true' : undefined,
        title: collapsed ? tooltip : undefined
      } as React.HTMLAttributes<HTMLElement>);
    }

    return (
      <button
        ref={ref}
        className={buttonClassName}
        data-active={isActive ? 'true' : undefined}
        title={collapsed ? tooltip : undefined}
        {...props}
      >
        {children}
      </button>
    );
  }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

export function SidebarMenuBadge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { state } = useSidebar();

  if (state === 'collapsed') {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center',
        className
      )}
      {...props}
    />
  );
}

export function SidebarInset({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-h-screen min-w-0 flex-1 flex-col', className)} {...props} />;
}

export function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar, state } = useSidebar();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('size-9 px-0', className)}
      aria-label={state === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar'}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="size-5" aria-hidden="true" />
    </Button>
  );
}

export function SidebarRail({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleSidebar, state } = useSidebar();

  return (
    <button
      type="button"
      aria-label={state === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar'}
      className={cn('absolute inset-y-0 -right-2 hidden w-4 cursor-ew-resize md:block', className)}
      onClick={toggleSidebar}
      {...props}
    />
  );
}
