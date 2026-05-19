import { X } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SheetContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheet() {
  const context = useContext(SheetContext);

  if (!context) {
    throw new Error('Sheet components must be used inside Sheet.');
  }

  return context;
}

export function Sheet({
  children,
  open = false,
  onOpenChange = () => undefined
}: PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) {
  return <SheetContext.Provider value={{ open, onOpenChange }}>{children}</SheetContext.Provider>;
}

export function SheetContent({ className, children }: PropsWithChildren<{ className?: string }>) {
  const { open, onOpenChange } = useSheet();

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        className="fixed inset-0 z-[var(--z-overlay)] bg-slate-950/40"
        onClick={() => onOpenChange(false)}
      />
      <div className={cn('animate-in slide-in-from-right duration-200', className)}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-3 top-3 size-8 px-0"
          aria-label="Close navigation"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
        {children}
      </div>
    </>
  );
}
