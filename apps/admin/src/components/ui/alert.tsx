import type { PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

export function Alert({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('rounded-md border border-input bg-card p-4', className)}>{children}</div>;
}

export function AlertTitle({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <h5 className={cn('mb-1 font-medium', className)}>{children}</h5>;
}

export function AlertDescription({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('text-sm text-muted-foreground', className)}>{children}</div>;
}
