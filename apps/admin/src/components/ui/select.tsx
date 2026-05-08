import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn('h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none', className)}
      {...props}
    />
  );
}
