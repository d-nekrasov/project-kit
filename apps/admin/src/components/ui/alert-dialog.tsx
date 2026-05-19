import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AlertDialog({ open, children }: PropsWithChildren<{ open: boolean }>) {
  if (!open) {
    return null;
  }

  return <>{children}</>;
}

export function AlertDialogContent({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" />
      <div className={cn('relative z-10 w-full max-w-md rounded-lg border bg-card p-6 shadow-xl', className)}>
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('mb-4 space-y-1', className)}>{children}</div>;
}

export function AlertDialogTitle({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <h2 className={cn('text-lg font-semibold text-foreground', className)}>{children}</h2>;
}

export function AlertDialogDescription({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('text-sm text-muted-foreground', className)}>{children}</div>;
}

export function AlertDialogFooter({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)}>{children}</div>;
}

export function AlertDialogCancel(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button type="button" variant="outline" {...props} />;
}

export function AlertDialogAction(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button type="button" variant="destructive" {...props} />;
}
