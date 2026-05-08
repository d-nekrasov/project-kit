import type { PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

export function Sheet({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export function SheetContent({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn(className)}>{children}</div>;
}
