import type { PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

export function Dialog({ open, children }: PropsWithChildren<{ open: boolean }>) {
  if (!open) {
    return null;
  }

  return <>{children}</>;
}

export function DialogContent({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/35" />
      <div className={cn('relative z-10 w-full max-w-lg rounded-lg border bg-white p-6 shadow-xl', className)}>{children}</div>
    </div>
  );
}

export function DialogHeader({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('mb-4 space-y-1', className)}>{children}</div>;
}

export function DialogTitle({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <h2 className={cn('text-lg font-semibold text-slate-900', className)}>{children}</h2>;
}

export function DialogDescription({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <p className={cn('text-sm text-slate-600', className)}>{children}</p>;
}

export function DialogFooter({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)}>{children}</div>;
}
