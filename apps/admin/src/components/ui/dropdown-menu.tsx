import type { PropsWithChildren, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function DropdownMenu({ children }: PropsWithChildren) {
  return <div className="relative">{children}</div>;
}

export function DropdownMenuTrigger({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function DropdownMenuContent({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('absolute right-0 z-20 mt-2 min-w-44 rounded-md border bg-white p-1 shadow', className)}>{children}</div>;
}

export function DropdownMenuItem({
  children,
  className,
  onClick
}: PropsWithChildren<{ className?: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-slate-100', className)}
    >
      {children}
    </button>
  );
}
