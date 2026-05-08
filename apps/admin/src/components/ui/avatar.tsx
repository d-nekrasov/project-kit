import type { PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

export function Avatar({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-slate-200', className)}>{children}</div>;
}

export function AvatarFallback({ children }: PropsWithChildren) {
  return <span className="text-xs font-semibold text-slate-700">{children}</span>;
}
