import type { PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

export function Alert({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        'relative w-full rounded-lg border border-input bg-card px-4 py-3 text-sm [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg]:text-current [&>svg~*]:pl-7',
        className
      )}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)}>{children}</h5>;
}

export function AlertDescription({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('text-sm text-muted-foreground [&_p]:leading-relaxed', className)}>{children}</div>;
}
